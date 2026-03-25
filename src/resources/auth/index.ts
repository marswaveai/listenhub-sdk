import type { ListenHubClient } from '../../client'
import type { CliInitResponse, TokenResponse } from '../../types/auth'

export class AuthResource {
  constructor(private client: ListenHubClient) {
    client._setAuth(this)
  }

  async cliInit(params: { callbackPort: number }): Promise<CliInitResponse> {
    return this.client.request('POST', '/v1/auth/cli/init', { body: params })
  }

  async cliToken(params: { sessionId: string; code: string }): Promise<TokenResponse> {
    return this.client.request('POST', '/v1/auth/cli/token', { body: params })
  }

  async refresh(params: { refreshToken: string }): Promise<TokenResponse> {
    return this.client.request('POST', '/v1/auth/token', {
      body: { grantType: 'refresh_token', refreshToken: params.refreshToken },
      skipAutoRefresh: true,
    })
  }

  async revoke(params: { refreshToken: string }): Promise<void> {
    await this.client.request('POST', '/v1/auth/token/revoke', { body: params })
  }
}
