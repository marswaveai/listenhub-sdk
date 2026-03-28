# ListenHub SDK

TypeScript SDK，封装 ListenHub API。Core + Adapter 分层：Core 是纯 HTTP 封装（跨平台），Adapter 处理环境特定 IO（如 CLI 登录流程）。

## 架构要点

- **依赖方向**：`adapters/ → resources/ → client.ts → types/`，单向，不可逆
- **resources/** 之间不互相依赖，每个 resource 挂载到 `ListenHubClient` 实例
- **adapters/** 可调用 resources 和 client，但 resources 不能 import adapters
- 主入口 `src/index.ts` 通过子类组装 `AuthResource`，避免循环依赖
- `./node` 子路径仅 Node 环境可用，`./browser` 子路径用于浏览器，`package.json exports` 中用条件限制

## Client 核心行为

- 基于 `ky`（fetch 封装），`throwHttpErrors: false`，`retry: 0`
- 后端响应格式 `{ code: 0, message, data }`：code 为 0 解包 data，非 0 抛 `ListenHubError`
- 请求体自动 `decamelizeKeys`，响应体自动 `camelcaseKeys`，`rawKeys: true` 可跳过
- 401 → 调 `onTokenExpired` 刷新 token → 重试一次（single-flight 去重，防并发重复刷新）
- 429 → 读 `Retry-After` header 或指数退避 → 重试最多 `maxRetries` 次
- `auth.refresh()` 内部标记 `skipAutoRefresh: true`，防止 401 递归
- Hooks：`onRequest(req: Request)`、`onResponse(res: Response, req: Request)` 在每次请求前后触发
- Content-type aware 错误解析：JSON（解析 `code`/`message`/`request_id`）、HTML（提取 `<title>` 作为 `GATEWAY_ERROR`）、其他（`UNKNOWN_ERROR`）

## 凭据管理

- 存储路径：`~/.listenhub/credentials.json`（0600 权限，原子写入）
- `loadCredentials` 在过期前 60 秒主动刷新
- `onTokenExpired` 链路：读文件 → refresh API → 原子写回 → 返回新 token

## Adapter 接口

`PlatformAdapter` 是平台适配器的统一接口，定义于 `src/types/adapter.ts`：

```ts
interface PlatformAdapter {
  auth: AuthStrategy       // login / logout 流程
  storage: StorageProvider // load / save / clear 凭据
  fileIO?: FileIOProvider  // 文件读取（可选）
  notify?: NotifyProvider  // 通知（可选）
}
```

`AuthAPI` 是 resources 暴露给 adapters 的最小 auth 接口，仅包含 `cliInit`、`cliToken`、`refresh`、`revoke`，避免 adapter 直接依赖 `AuthResource` 类。

## 新增 Resource 模块的模式

1. `src/resources/<name>/methods.ts` 中写纯函数（接收 `client` 作为第一参数），方便单独测试
2. `src/resources/<name>/index.ts` 中创建类，构造函数接收 `ListenHubClient`，方法代理到 `methods.ts`
3. 在 `src/index.ts` 的 `ListenHubClient` 子类构造函数中实例化并挂载
4. 类型定义放 `src/types/<name>.ts`，从 `src/index.ts` re-export

## 新增 Adapter 的模式

1. `src/adapters/<name>/index.ts` 中实现，实现 `PlatformAdapter` 接口，可调用 `AuthAPI` 和 `StorageProvider`
2. `package.json` 的 `exports` 中显式添加子路径（不用通配符）
3. `tsup.config.ts` 中添加对应 entry point

## 构建与测试

- `tsup` 多入口构建（index + node + browser），ESM + CJS 双格式
- `vitest` 测试，单元测试 mock `global.fetch`，集成测试用 Express mock server（`get-port` 动态端口）
- `tsc --noEmit` 做类型检查
