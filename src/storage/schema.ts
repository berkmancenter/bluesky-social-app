/**
 * Device data that's specific to the device and does not vary based account
 */
export type Device = {
  fontScale: '-2' | '-1' | '0' | '1' | '2'
  fontFamily: 'system' | 'theme'
  lastNuxDialog: string | undefined
  geolocation?: {
    countryCode: string | undefined
  }
  trendingBetaEnabled: boolean
  devMode: boolean
  demoMode: boolean
  activitySubscriptionsNudged?: boolean
}

export type Account = {
  searchTermHistory?: string[]
  searchAccountHistory?: string[]
}

export type CredentialConnection = {
  connectionId: string
  status: 'active'
  createdAt: string
  updatedAt: string
}

export type ProofRequest = {
  presExId: string
  connectionId: string
  credentialDefinitionId: string
  status:
    | 'request-sent'
    | 'request-received'
    | 'presentation-sent'
    | 'presentation-received'
    | 'verified'
    | 'done'
  createdAt: string
  updatedAt: string
}
