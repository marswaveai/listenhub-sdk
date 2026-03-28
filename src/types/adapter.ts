// NOTE: This file must NOT import from client.ts to preserve
// dependency direction: adapters → resources → client → types.

import type { CliInitResponse, TokenResponse, StoredCredentials } from './auth'

/** Minimal auth API surface — implemented by AuthResource */
export interface AuthAPI {
  cliInit(params: { callbackPort: number }): Promise<CliInitResponse>
  cliToken(params: { sessionId: string; code: string }): Promise<TokenResponse>
  refresh(params: { refreshToken: string }): Promise<TokenResponse>
  revoke(params: { refreshToken: string }): Promise<void>
}

export interface AuthStrategy {
  login(authAPI: AuthAPI): Promise<TokenResponse>
  logout(authAPI: AuthAPI): Promise<void>
}

export interface StorageProvider {
  load(): Promise<StoredCredentials | null>
  save(credentials: StoredCredentials): Promise<void>
  clear(): Promise<void>
}

export interface FileIOProvider {
  readFile(path: string): Promise<ReadableStream | Blob>
}

export interface NotifyOptions {
  title?: string
  level?: 'info' | 'warn' | 'error'
}

export interface NotifyProvider {
  notify(message: string, options?: NotifyOptions): Promise<void>
}

export interface PlatformAdapter {
  auth: AuthStrategy
  storage: StorageProvider
  fileIO?: FileIOProvider
  notify?: NotifyProvider
}
