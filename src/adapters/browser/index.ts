import type { AuthAPI, AuthStrategy, StorageProvider, PlatformAdapter } from '../../types/adapter'
import type { TokenResponse, StoredCredentials } from '../../types/auth'

const STORAGE_KEY = 'listenhub_credentials'

class BrowserAuthStrategy implements AuthStrategy {
  async login(_authAPI: AuthAPI): Promise<TokenResponse> {
    throw new Error(
      'BrowserAdapter.auth.login() is not implemented. ' +
      'Use your app\'s OAuth flow to obtain tokens, then pass accessToken to ClientOptions.',
    )
  }

  async logout(_authAPI: AuthAPI): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable — silently skip
    }
  }
}

class LocalStorageProvider implements StorageProvider {
  async load(): Promise<StoredCredentials | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoredCredentials
    } catch {
      return null
    }
  }

  async save(credentials: StoredCredentials): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
    } catch {
      // localStorage unavailable (SSR, service worker) — silently skip
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable — silently skip
    }
  }
}

export class BrowserAdapter implements PlatformAdapter {
  auth: AuthStrategy
  storage: StorageProvider

  constructor() {
    this.storage = new LocalStorageProvider()
    this.auth = new BrowserAuthStrategy()
  }
}
