export interface ConnectionInvitation {
  connection_id: string
  invitation: {
    '@type': string
    '@id': string
    label: string
    recipientKeys: string[]
    serviceEndpoint: string
  }
  invitation_url: string
}

export interface Connection {
  connection_id: string
  state: 'invitation' | 'request' | 'response' | 'active' | 'error'
  their_label?: string
  created_at: string
  updated_at: string
}

// TODO: Add proof request types
