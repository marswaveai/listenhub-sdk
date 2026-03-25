import type { ListenHubClient } from '../../client'

export class AuthResource {
  constructor(private client: ListenHubClient) {
    client._setAuth(this)
  }
}
