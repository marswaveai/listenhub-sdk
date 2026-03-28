import type { ListenHubClient } from '../../client'
import type { ConnectInitResponse, TokenResponse } from '../../types/auth'
import * as methods from './methods'

export class AuthResource {
  constructor(private client: ListenHubClient) {
    client._setAuth(this)
  }

  connectInit(params: { callbackPort: number }): Promise<ConnectInitResponse> {
    return methods.connectInit(this.client, params)
  }

  connectToken(params: { sessionId: string; code: string }): Promise<TokenResponse> {
    return methods.connectToken(this.client, params)
  }

  refresh(params: { refreshToken: string }): Promise<TokenResponse> {
    return methods.refresh(this.client, params)
  }

  async revoke(params: { refreshToken: string }): Promise<void> {
    return methods.revoke(this.client, params)
  }
}
