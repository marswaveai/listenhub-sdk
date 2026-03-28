import { ListenHubClient as BaseClient } from './client'
import { AuthResource } from './resources/auth/index'
import type { ClientOptions } from './types/client'

export class ListenHubClient extends BaseClient {
  constructor(options?: ClientOptions) {
    super(options)
    new AuthResource(this)
  }
}

export { ListenHubError } from './types/common'
export type { ClientOptions } from './types/client'
export type { ConnectInitResponse, TokenResponse } from './types/auth'
export type { RequestOptions } from './types/common'
export type {
  AuthAPI,
  AuthStrategy,
  StorageProvider,
  FileIOProvider,
  NotifyProvider,
  NotifyOptions,
  PlatformAdapter,
} from './types/adapter'
export type { StoredCredentials } from './types/auth'
