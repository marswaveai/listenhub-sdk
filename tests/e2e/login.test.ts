/**
 * Interactive login for e2e testing.
 *
 * Usage:
 *   pnpm test:login
 *
 * Opens a browser for you to log in, then saves the access token
 * to .env.staging so subsequent `pnpm test:e2e` runs can use it.
 */
import { it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ListenHubClient } from '../../src/index'
import { NodeAdapter } from '../../src/adapters/node/index'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_FILE = path.resolve(__dirname, '../../.env.staging')
const API_URL = process.env.LISTENHUB_API_URL || 'https://api.staging.listenhub.ai/api'

it('interactive login — opens browser, saves token to .env.staging', async () => {
  console.log('\n🔑 Starting interactive login against:', API_URL)
  console.log('   A browser window will open. Please log in.\n')

  const adapter = new NodeAdapter({ loginTimeout: 120_000 })
  const client = new ListenHubClient({ baseURL: API_URL, adapter })

  const tokens = await adapter.auth.login(client.auth)

  console.log('\n✅ Login successful!')
  console.log('   accessToken:', tokens.accessToken.slice(0, 20) + '...')

  // Update .env.staging
  let envContent = ''
  try {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8')
  } catch {
    envContent = `LISTENHUB_API_URL=${API_URL}\nLISTENHUB_ACCESS_TOKEN=\n`
  }

  if (envContent.includes('LISTENHUB_ACCESS_TOKEN=')) {
    envContent = envContent.replace(
      /LISTENHUB_ACCESS_TOKEN=.*/,
      `LISTENHUB_ACCESS_TOKEN=${tokens.accessToken}`,
    )
  } else {
    envContent += `\nLISTENHUB_ACCESS_TOKEN=${tokens.accessToken}\n`
  }

  fs.writeFileSync(ENV_FILE, envContent)
  console.log('   Token saved to .env.staging')
  console.log('   Now run: pnpm test:e2e')
}, 120_000)
