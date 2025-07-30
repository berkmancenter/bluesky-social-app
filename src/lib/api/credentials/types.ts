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

// Proof Request Types
export interface ProofRequest {
  connection_id: string
  anoncreds: {
    cred_def_id: string
  }
  presentation_request: {
    anoncreds: {
      name: string
      version: string
      requested_attributes: Record<
        string,
        {
          name: string
          restrictions: Array<{
            cred_def_id: string
          }>
        }
      >
      requested_predicates: Record<
        string,
        {
          name: string
          p_type: string
          p_value: number
          restrictions: Array<{
            cred_def_id: string
          }>
        }
      >
      nonce: string
    }
  }
}

export interface ProofRequestResponse {
  pres_ex_id: string
  state:
    | 'request-sent'
    | 'request-received'
    | 'presentation-sent'
    | 'presentation-received'
    | 'verified'
    | 'done'
  created_at: string
  updated_at: string
}

export interface ProofRecord {
  pres_ex_id: string
  state:
    | 'request-sent'
    | 'request-received'
    | 'presentation-sent'
    | 'presentation-received'
    | 'verified'
    | 'done'
  created_at: string
  updated_at: string
  presentation_request: any
  presentation: any
}
