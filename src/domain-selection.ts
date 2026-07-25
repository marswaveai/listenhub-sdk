/**
 * 部分网络（如中国大陆）对出厂默认域整域不可达，但备选域可达。这里把「用哪个域」
 * 做成一次性选出、粘性生效的进程/机器级状态，而不是每个请求各自的重试策略：
 * 选定域之后所有请求——包括扣费类 POST——都只往选定域发一次，不存在跨域重发，
 * 因此没有「默认域超时但服务端已收到」导致双份生成/双扣的风险。
 */

interface DomainCandidate {
	/** `LISTENHUB_DOMAIN` 可以填的短名。 */
	alias: string;
	host: string;
}

/** 默认域 → 备选域。换域只改这张表，不动下面的逻辑。 */
const DOMAIN_FALLBACKS: Record<string, readonly DomainCandidate[]> = {
	'api.listenhub.ai': [{alias: 'app', host: 'api.listenhub.app'}],
	'api.marswave.ai': [{alias: 'app', host: 'api.listenhub.app'}],
};

/** 备选域探活的超时。探活只在真实请求已经失败后发生，不影响正常路径。 */
const PROBE_TIMEOUT_MS = 5000;

const STORE_FILE_NAME = 'domain.json';

interface DomainStore {
	/** 默认域 host → 已验证可达的 host。只记录切换结果，走默认域的用户不落盘。 */
	discovered?: Record<string, string>;
}

export interface DomainSelectionOptions {
	/** 出厂默认 Base URL 的 host。 */
	defaultHost: string;
	/** 非幂等请求失败后，用来验证备选域可达的 GET path（含 Base URL 的 path 前缀）。 */
	probePath: string;
}

export type FetchLike = (request: Request, init?: RequestInit) => Promise<Response>;

/**
 * 非幂等请求碰到默认域不可达时抛这个。ky 默认会重试连接层失败的 POST，重试时选定域
 * 已经切走，等于把这条请求又发去了另一个域——正是这里要禁止的重发。两个 client 的
 * `shouldRetry` 靠这个类型把它挡掉。
 */
export class DomainSwitchedError extends TypeError {
	constructor(message: string, options: {cause: unknown}) {
		super(message, options);
		this.name = 'DomainSwitchedError';
	}
}

function getEnv(name: string): string | undefined {
	return globalThis.process?.env?.[name];
}

/** 无文件系统（浏览器等）时这就是唯一存储，实例/页面级生效。 */
let memoryStore: DomainStore | undefined;
let storeLoaded = false;

type NodeFsPromises = typeof import('node:fs/promises');

async function loadNodeModules(): Promise<{fs: NodeFsPromises; storePath: string} | undefined> {
	try {
		const [fs, os, path] = await Promise.all([
			import('node:fs/promises'),
			import('node:os'),
			import('node:path'),
		]);
		const xdg = getEnv('XDG_CONFIG_HOME');
		const base = xdg ?? path.join(os.homedir(), '.config');
		return {fs, storePath: path.join(base, 'listenhub', STORE_FILE_NAME)};
	} catch {
		return undefined;
	}
}

async function readStore(): Promise<DomainStore> {
	if (storeLoaded) return memoryStore ?? {};
	storeLoaded = true;

	const node = await loadNodeModules();
	if (!node) {
		memoryStore ??= {};
		return memoryStore;
	}

	try {
		const raw = await node.fs.readFile(node.storePath, 'utf8');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- 读坏了走 catch
		memoryStore = JSON.parse(raw) as DomainStore;
	} catch {
		memoryStore = {};
	}

	return memoryStore;
}

/** 写不进磁盘不算失败：内存里记住即可，本进程仍然受益。 */
async function writeStore(store: DomainStore): Promise<void> {
	memoryStore = store;
	storeLoaded = true;

	const node = await loadNodeModules();
	if (!node) return;

	try {
		const dir = node.storePath.slice(0, node.storePath.lastIndexOf('/'));
		await node.fs.mkdir(dir, {recursive: true});
		const tmpPath = `${node.storePath}.tmp.${globalThis.process?.pid ?? 0}`;
		await node.fs.writeFile(tmpPath, JSON.stringify(store, null, '\t'));
		await node.fs.rename(tmpPath, node.storePath);
	} catch {
		// 只读文件系统 / 无 HOME：内存已生效，不打断请求
	}
}

async function recordSelection(defaultHost: string, host: string): Promise<void> {
	const store = await readStore();
	const discovered = {...store.discovered};
	if (host === defaultHost) {
		delete discovered[defaultHost];
	} else {
		discovered[defaultHost] = host;
	}

	await writeStore({...store, discovered});
}

function resolveEnvDomain(defaultHost: string): string | undefined {
	const raw = getEnv('LISTENHUB_DOMAIN')?.trim();
	if (!raw) return undefined;
	if (raw === 'default') return defaultHost;

	const candidate = (DOMAIN_FALLBACKS[defaultHost] ?? []).find(
		(c) => c.alias === raw || c.host === raw,
	);
	return candidate?.host;
}

async function getSelectedHost(defaultHost: string): Promise<string> {
	const fromEnv = resolveEnvDomain(defaultHost);
	if (fromEnv) return fromEnv;

	const store = await readStore();
	return store.discovered?.[defaultHost] ?? defaultHost;
}

/**
 * 只把「没拿到 HTTP 响应」判为域不可达。拿到任何状态码都说明域是通的，
 * 401/5xx 是服务端问题，不该触发切域。
 */
function isConnectionFailure(error: unknown): boolean {
	if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
		return false;
	}

	return error instanceof TypeError;
}

function withHost(request: Request, host: string): Request {
	const url = new URL(request.url);
	url.host = host;
	return new Request(url, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		signal: request.signal,
		redirect: request.redirect,
		// Node 的 fetch 要求带 stream body 时显式声明；类型里没有这个字段。
		duplex: 'half',
	} as RequestInit);
}

async function probe(host: string, probePath: string): Promise<boolean> {
	try {
		const response = await globalThis.fetch(`https://${host}${probePath}`, {
			method: 'GET',
			signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
		});
		void response.body?.cancel();
		return true;
	} catch {
		return false;
	}
}

/** 排除刚失败的域，其余候选（含默认域）依次探活；都不通则清掉记录回到默认域。 */
async function reselect(
	opts: DomainSelectionOptions,
	failedHost: string,
): Promise<string | undefined> {
	const order = [
		...(DOMAIN_FALLBACKS[opts.defaultHost] ?? []).map((c) => c.host),
		opts.defaultHost,
	].filter((host) => host !== failedHost);

	for (const host of order) {
		// eslint-disable-next-line no-await-in-loop -- 探活要按优先级顺序短路
		if (await probe(host, opts.probePath)) {
			await recordSelection(opts.defaultHost, host);
			return host;
		}
	}

	await recordSelection(opts.defaultHost, opts.defaultHost);
	return undefined;
}

function isIdempotent(method: string): boolean {
	return method === 'GET' || method === 'HEAD';
}

/**
 * ponytail: 只处理「快速失败」的连接层错误（DNS/连接被拒/TLS），不处理默认域挂死到超时的情况——
 * ky 的 timeout 会 abort 掉共享 signal，包装器来不及换域。挂死的用户用
 * `LISTENHUB_DOMAIN` / `baseURL` 显式指定即可。升级路径：给默认域首次请求单独的连接超时。
 */
export function createDomainSelectingFetch(opts: DomainSelectionOptions): FetchLike | undefined {
	const candidates = DOMAIN_FALLBACKS[opts.defaultHost] ?? [];
	if (candidates.length === 0) return undefined;

	return async (request, init) => {
		const selected = await getSelectedHost(opts.defaultHost);
		const target = selected === opts.defaultHost ? request : withHost(request, selected);

		try {
			return await globalThis.fetch(target, init);
		} catch (error) {
			if (!isConnectionFailure(error)) throw error;

			// 幂等请求可以直接换域重发，重发本身就是探活。
			if (isIdempotent(request.method)) {
				const order = [...candidates.map((c) => c.host), opts.defaultHost].filter(
					(host) => host !== selected,
				);

				for (const host of order) {
					try {
						// eslint-disable-next-line no-await-in-loop -- 按优先级顺序试，通了就停
						const response = await globalThis.fetch(withHost(request, host), init);
						await recordSelection(opts.defaultHost, host);
						return response;
					} catch (retryError) {
						if (!isConnectionFailure(retryError)) throw retryError;
					}
				}

				await recordSelection(opts.defaultHost, opts.defaultHost);
				throw error;
			}

			// 非幂等请求绝不换域重发：默认域没响应不代表服务端没收到，重发可能双份扣费。
			// 只更新选定域，让调用方重试时走新域。
			const next = await reselect(opts, selected);
			if (!next) throw error;

			throw new DomainSwitchedError(
				`${(error as Error).message} — ${selected} is unreachable; switched to ${next}. ` +
					'This request was not resent (non-idempotent). Please retry.',
				{cause: error},
			);
		}
	};
}

/** 测试用：清掉进程内缓存，强制下次重新读盘。 */
export function resetDomainSelectionCache(): void {
	memoryStore = undefined;
	storeLoaded = false;
}
