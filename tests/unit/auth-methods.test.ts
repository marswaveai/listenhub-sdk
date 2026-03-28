import { describe, it, expect, vi } from 'vitest'
import * as methods from '../../src/resources/auth/methods'

function mockClient(requestFn: ReturnType<typeof vi.fn>) {
  return { request: requestFn } as any
}

describe('auth/methods', () => {
  describe('refresh()', () => {
    it('sends POST to /v1/auth/token with skipAutoRefresh', async () => {
      const request = vi.fn().mockResolvedValueOnce({
        accessToken: 'new',
        refreshToken: 'rt',
        expiresIn: 3600,
      })
      const client = mockClient(request)

      await methods.refresh(client, { refreshToken: 'old_rt' })

      expect(request).toHaveBeenCalledWith('POST', '/v1/auth/token', {
        body: { grantType: 'refresh_token', refreshToken: 'old_rt' },
        skipAutoRefresh: true,
      })
    })
  })

  describe('connectInit()', () => {
    it('sends POST to /v1/auth/connect/init', async () => {
      const request = vi.fn().mockResolvedValueOnce({
        sessionId: 'sid',
        authUrl: 'https://auth.test.com',
      })
      const client = mockClient(request)

      const result = await methods.connectInit(client, { callbackPort: 9999 })

      expect(request).toHaveBeenCalledWith('POST', '/v1/auth/connect/init', {
        body: { callbackPort: 9999 },
      })
      expect(result.sessionId).toBe('sid')
    })
  })

  describe('connectToken()', () => {
    it('sends POST to /v1/auth/connect/token', async () => {
      const request = vi.fn().mockResolvedValueOnce({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
      })
      const client = mockClient(request)

      await methods.connectToken(client, { sessionId: 'sid', code: 'code123' })

      expect(request).toHaveBeenCalledWith('POST', '/v1/auth/connect/token', {
        body: { sessionId: 'sid', code: 'code123' },
      })
    })
  })

  describe('revoke()', () => {
    it('sends POST to /v1/auth/token/revoke', async () => {
      const request = vi.fn().mockResolvedValueOnce(undefined)
      const client = mockClient(request)

      await methods.revoke(client, { refreshToken: 'rt' })

      expect(request).toHaveBeenCalledWith('POST', '/v1/auth/token/revoke', {
        body: { refreshToken: 'rt' },
      })
    })
  })
})
