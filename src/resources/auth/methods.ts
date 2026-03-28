import type { ListenHubClient } from '../../client'
import type { ConnectInitResponse, TokenResponse } from '../../types/auth'

export async function refresh(
  client: ListenHubClient,
  params: { refreshToken: string },
): Promise<TokenResponse> {
  return client.request<TokenResponse>('POST', '/v1/auth/token', {
    body: { grantType: 'refresh_token', refreshToken: params.refreshToken },
    skipAutoRefresh: true,
  })
}

export async function connectInit(
  client: ListenHubClient,
  params: { callbackPort: number },
): Promise<ConnectInitResponse> {
  return client.request<ConnectInitResponse>('POST', '/v1/auth/connect/init', {
    body: params,
  })
}

export async function connectToken(
  client: ListenHubClient,
  params: { sessionId: string; code: string },
): Promise<TokenResponse> {
  return client.request<TokenResponse>('POST', '/v1/auth/connect/token', {
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
