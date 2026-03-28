import type { ListenHubClient } from '../../client'
import type { CliInitResponse, TokenResponse } from '../../types/auth'

export async function refresh(
  client: ListenHubClient,
  params: { refreshToken: string },
): Promise<TokenResponse> {
  return client.request<TokenResponse>('POST', '/v1/auth/token', {
    body: { grantType: 'refresh_token', refreshToken: params.refreshToken },
    skipAutoRefresh: true,
  })
}

export async function cliInit(
  client: ListenHubClient,
  params: { callbackPort: number },
): Promise<CliInitResponse> {
  return client.request<CliInitResponse>('POST', '/v1/auth/cli/init', {
    body: params,
  })
}

export async function cliToken(
  client: ListenHubClient,
  params: { sessionId: string; code: string },
): Promise<TokenResponse> {
  return client.request<TokenResponse>('POST', '/v1/auth/cli/token', {
    body: params,
  })
}

export async function revoke(
  client: ListenHubClient,
  params: { refreshToken: string },
): Promise<void> {
  await client.request<void>('POST', '/v1/auth/token/revoke', {
    body: params,
  })
}
