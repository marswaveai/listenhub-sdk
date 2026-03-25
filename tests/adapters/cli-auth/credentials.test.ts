import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  readCredentials,
  writeCredentials,
  deleteCredentials,
  DEFAULT_TOKEN_STORE_PATH,
} from '../../../src/adapters/cli-auth/credentials'
import type { StoredCredentials } from '../../../src/types/auth'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-cred-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('credentials', () => {
  const creds: StoredCredentials = {
    accessToken: 'at-123',
    refreshToken: 'rt-456',
    expiresAt: Date.now() + 3600_000,
  }

  it('DEFAULT_TOKEN_STORE_PATH points to ~/.listenhub/credentials.json', () => {
    expect(DEFAULT_TOKEN_STORE_PATH).toBe(
      path.join(os.homedir(), '.listenhub', 'credentials.json')
    )
  })

  it('writeCredentials creates directory and file with correct permissions', async () => {
    const filePath = path.join(tmpDir, 'sub', 'credentials.json')
    await writeCredentials(filePath, creds)

    const dirStat = fs.statSync(path.dirname(filePath))
    expect(dirStat.mode & 0o777).toBe(0o700)

    const fileStat = fs.statSync(filePath)
    expect(fileStat.mode & 0o777).toBe(0o600)

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    expect(content).toEqual(creds)
  })

  it('readCredentials returns stored credentials', async () => {
    const filePath = path.join(tmpDir, 'credentials.json')
    await writeCredentials(filePath, creds)
    const result = await readCredentials(filePath)
    expect(result).toEqual(creds)
  })

  it('readCredentials returns null when file does not exist', async () => {
    const result = await readCredentials(path.join(tmpDir, 'nonexistent.json'))
    expect(result).toBeNull()
  })

  it('deleteCredentials removes the file', async () => {
    const filePath = path.join(tmpDir, 'credentials.json')
    await writeCredentials(filePath, creds)
    await deleteCredentials(filePath)
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('deleteCredentials does not throw if file does not exist', async () => {
    await expect(
      deleteCredentials(path.join(tmpDir, 'nonexistent.json'))
    ).resolves.not.toThrow()
  })
})
