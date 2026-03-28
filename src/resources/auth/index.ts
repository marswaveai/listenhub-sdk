import type { ListenHubClient } from '../../client'
import type { CliInitResponse, TokenResponse } from '../../types/auth'
import * as methods from './methods'

export class AuthResource {
  constructor(private client: ListenHubClient) {
    client._setAuth(this)
  }

  cliInit(params: { callbackPort: number }): Promise<CliInitResponse> {
    return methods.cliInit(this.client, params)
  }

  cliToken(params: { sessionId: string; code: string }): Promise<TokenResponse> {
    return methods.cliToken(this.client, params)
  }

  refresh(params: { refreshToken: string }): Promise<TokenResponse> {
    return methods.refresh(this.client, params)
  }

  async revoke(params: { refreshToken: string }): Promise<void> {
    return methods.revoke(this.client, params)
  }
}
