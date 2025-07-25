import {CREDENTIAL_VERIFIER_ENDPOINT} from '#/lib/constants'
import {type Connection, type ConnectionInvitation} from './types'

class ConnectionsAPI {
  private baseUrl = CREDENTIAL_VERIFIER_ENDPOINT

  async createInvitation(_metadata?: any): Promise<ConnectionInvitation> {
    const response = await fetch(
      `${this.baseUrl}/connections/create-invitation`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to create invitation: ${response.statusText}`)
    }

    return response.json()
  }

  async getConnections(): Promise<{results: Connection[]}> {
    const response = await fetch(`${this.baseUrl}/connections`)

    if (!response.ok) {
      throw new Error(`Failed to get connections: ${response.statusText}`)
    }

    return response.json()
  }

  async getConnection(id: string): Promise<Connection> {
    const response = await fetch(`${this.baseUrl}/connections/${id}`)

    if (!response.ok) {
      throw new Error(`Failed to get connection: ${response.statusText}`)
    }

    return response.json()
  }
}

export const connectionsAPI = new ConnectionsAPI()
