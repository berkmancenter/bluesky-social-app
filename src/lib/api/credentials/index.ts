import {connectionsAPI} from './connections'

export class CredentialsAPI {
  connections = connectionsAPI

  async startCredentialFlow(credentialType: string) {
    // Create connection invitation
    const invitation = await this.connections.createInvitation({
      label: `${credentialType} Credential`,
      metadata: {credentialType},
    })

    return invitation
  }

  // TODO: Add proof request functionality
}

export const credentialsAPI = new CredentialsAPI()

// Re-export everything for convenience
export {connectionsAPI} from './connections'
export * from './types'
