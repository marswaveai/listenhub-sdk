# @marswave/listenhub-sdk

ListenHub API 的 TypeScript SDK。采用 Core + Adapter 分层架构，核心层跨平台，适配层按环境扩展。

## 安装

```bash
npm install @marswave/listenhub-sdk
```

要求 Node.js >= 18（使用内置 `fetch`，零外部 HTTP 依赖）。

## 快速上手

### CLI 登录

```typescript
import { ListenHubClient } from '@marswave/listenhub-sdk'
import { cliLogin } from '@marswave/listenhub-sdk/cli-auth'

const client = new ListenHubClient()
await cliLogin({ client })
// 浏览器打开授权页 → 回调完成 → token 自动存储到 ~/.listenhub/credentials.json
```

### 已登录后使用

```typescript
import { createAuthenticatedClient } from '@marswave/listenhub-sdk/cli-auth'

const client = await createAuthenticatedClient()
// 自动加载本地 token，过期自动刷新
const episodes = await client.request('GET', '/v1/episodes')
```

### 服务端 / 脚本（已有 token）

```typescript
import { ListenHubClient } from '@marswave/listenhub-sdk'

const client = new ListenHubClient({ accessToken: process.env.LH_TOKEN })
const episodes = await client.request('GET', '/v1/episodes')
```

### 登出

```typescript
import { cliLogout } from '@marswave/listenhub-sdk/cli-auth'

const result = await cliLogout({ client })
// 撤销服务端 token + 删除本地凭据文件
```

## 架构

```
@marswave/listenhub-sdk
├── Core（"."）          跨平台，Node / 浏览器通用
│   ├── ListenHubClient    HTTP 客户端，自动处理 401 刷新、429 重试
│   └── resources/auth     Auth API 封装（cliInit / cliToken / refresh / revoke）
│
└── Adapter（"./cli-auth"） Node 专属，CLI 环境
    ├── cliLogin             完整 OAuth 登录流程（本地 server + 浏览器授权）
    ├── loadCredentials      读取并自动刷新本地凭据
    ├── createAuthenticatedClient  一行创建已认证 client
    └── cliLogout            撤销 token + 清理本地文件
```

依赖方向单向：`adapters → resources → client → types`。

## Client 配置

```typescript
const client = new ListenHubClient({
  baseURL: 'https://api.listenhub.ai/api',  // 默认
  accessToken: 'xxx',                        // 可选
  timeout: 30_000,                           // 默认 30s
  maxRetries: 2,                             // 429 重试次数，默认 2，设 0 关闭
  onTokenExpired: async () => '...',         // 401 时自动调用
})
```

### 自动重试

收到 429 时，SDK 自动读取 `Retry-After` 响应头等待后重试。没有该头则使用指数退避（1s → 2s → 4s...）。最多重试 `maxRetries` 次。

### 自动刷新

收到 401 时，调用 `onTokenExpired` 获取新 token 并重试一次。并发请求共享同一次 refresh 调用（single-flight 去重）。

## 错误处理

```typescript
import { ListenHubError } from '@marswave/listenhub-sdk'

try {
  await client.request('POST', '/v1/episodes', { body: { ... } })
} catch (err) {
  if (err instanceof ListenHubError) {
    console.log(err.status)     // HTTP 状态码
    console.log(err.code)       // 后端错误码，如 '21002'
    console.log(err.message)    // 错误描述
    console.log(err.requestId)  // 可选，用于追踪
  }
}
```

## 凭据存储

CLI adapter 将 token 存储在 `~/.listenhub/credentials.json`：

- 目录权限 `0700`，文件权限 `0600`
- 原子写入（写临时文件 → rename），防止中断导致 JSON 损坏
- token 过期前 60 秒自动触发刷新

## Package Exports

| 路径 | 环境 | 内容 |
|------|------|------|
| `@marswave/listenhub-sdk` | Node / 浏览器 | `ListenHubClient`、`ListenHubError`、类型 |
| `@marswave/listenhub-sdk/cli-auth` | Node only | `cliLogin`、`loadCredentials`、`createAuthenticatedClient`、`cliLogout` |

ESM 和 CJS 双格式输出。

## 开发

```bash
npm install          # 安装依赖
npm test             # 跑测试
npm run test:watch   # watch 模式
npm run lint         # 类型检查
npm run build        # 构建 dist/
```

## License

UNLICENSED
