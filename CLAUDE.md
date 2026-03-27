# ListenHub SDK

TypeScript SDK，封装 ListenHub API。Core + Adapter 分层：Core 是纯 HTTP 封装（跨平台），Adapter 处理环境特定 IO（如 CLI 登录流程）。

## 架构要点

- **依赖方向**：`adapters/ → resources/ → client.ts → types/`，单向，不可逆
- **resources/** 之间不互相依赖，每个 resource 挂载到 `ListenHubClient` 实例
- **adapters/** 可调用 resources 和 client，但 resources 不能 import adapters
- 主入口 `src/index.ts` 通过子类组装 `AuthResource`，避免循环依赖
- `./cli-auth` 子路径仅 Node 环境可用，`package.json exports` 中用 `node` 条件限制

## Client 核心行为

- 基于内置 `fetch`，零 HTTP 依赖
- 后端响应格式 `{ code: 0, message, data }`：code 为 0 解包 data，非 0 抛 `ListenHubError`
- 401 → 调 `onTokenExpired` 刷新 token → 重试一次（single-flight 去重，防并发重复刷新）
- 429 → 读 `Retry-After` header 或指数退避 → 重试最多 `maxRetries` 次
- `auth.refresh()` 内部标记 `skipAutoRefresh: true`，防止 401 递归

## 凭据管理

- 存储路径：`~/.listenhub/credentials.json`（0600 权限，原子写入）
- `loadCredentials` 在过期前 60 秒主动刷新
- `onTokenExpired` 链路：读文件 → refresh API → 原子写回 → 返回新 token

## 新增 Resource 模块的模式

1. `src/resources/<name>/index.ts` 中创建类，构造函数接收 `ListenHubClient`
2. 方法内调 `this.client.request(method, path, options)` 即可
3. 在 `src/index.ts` 的 `ListenHubClient` 子类构造函数中实例化并挂载
4. 类型定义放 `src/types/<name>.ts`，从 `src/index.ts` re-export

## 新增 Adapter 的模式

1. `src/adapters/<name>/index.ts` 中实现，可调用 resources 和 client
2. `package.json` 的 `exports` 中显式添加子路径（不用通配符）
3. `tsup.config.ts` 中添加对应 entry point

## 构建与测试

- `tsup` 双入口构建（index + cli-auth），ESM + CJS 双格式
- `vitest` 测试，mock `global.fetch`
- `tsc --noEmit` 做类型检查
