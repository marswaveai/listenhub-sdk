import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type { StoredCredentials } from '../../types/auth'

export const DEFAULT_TOKEN_STORE_PATH = path.join(
  os.homedir(),
  '.listenhub',
  'credentials.json',
)

export async function readCredentials(
  filePath: string = DEFAULT_TOKEN_STORE_PATH,
): Promise<StoredCredentials | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as StoredCredentials
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function writeCredentials(
  filePath: string,
  credentials: StoredCredentials,
): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  const tmpPath = `${filePath}.${process.pid}.tmp`
  const content = JSON.stringify(credentials, null, 2)
  await fs.writeFile(tmpPath, content, { mode: 0o600 })
  await fs.rename(tmpPath, filePath)
}

export async function deleteCredentials(
  filePath: string = DEFAULT_TOKEN_STORE_PATH,
): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    throw err
  }
}
