import {connectionsAPI} from './connections'
import {proofRequestsAPI} from './proof-requests'

export class CredentialsAPI {
  connections = connectionsAPI
  proofRequests = proofRequestsAPI

  async startCredentialFlow(credentialType: string) {
    // Create connection invitation
    const invitation = await this.connections.createInvitation({
      label: `${credentialType} Credential`,
      metadata: {credentialType},
    })

    return invitation
  }

  async requestAgeProof(connectionId: string, credentialDefinitionId: string) {
    // Calculate 18+ age threshold
    const year = new Date().getFullYear()
    const eighteenYearsAgo = new Date()
    eighteenYearsAgo.setFullYear(year - 18)

    // Calculate threshold in YYYYMMDD format
    const eighteenThreshold = parseInt(
      eighteenYearsAgo.getFullYear() +
        String(eighteenYearsAgo.getMonth() + 1).padStart(2, '0') +
        String(eighteenYearsAgo.getDate()).padStart(2, '0'),
      10,
    )

    const proofRequest = {
      connection_id: connectionId,
      anoncreds: {
        cred_def_id: credentialDefinitionId,
      },
      presentation_request: {
        anoncreds: {
          name: 'mDL Age Verification',
          version: '1.0',
          requested_attributes: {
            issuing_authority: {
              name: 'issuing_authority',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            // Add expiry date attribute for MDL (correct property name)
            expiry_date: {
              name: 'expiry_date',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
          },
          requested_predicates: {
            age_verification: {
              name: 'date_of_birth',
              p_type: '<=',
              p_value: eighteenThreshold,
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
          },
          nonce: Math.floor(Math.random() * 1000000000).toString(),
        },
      },
    }

    return await this.proofRequests.sendProofRequest(proofRequest)
  }

  async requestAccountProof(
    connectionId: string,
    credentialDefinitionId: string,
  ) {
    const proofRequest = {
      connection_id: connectionId,
      anoncreds: {
        cred_def_id: credentialDefinitionId,
      },
      presentation_request: {
        anoncreds: {
          name: 'X Account Verification',
          version: '1.0',
          requested_attributes: {
            screen_name: {
              name: 'screen_name',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            verification_timestamp: {
              name: 'verification_timestamp',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            host: {
              name: 'host',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            notary_url: {
              name: 'notary_url',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            verifier_key: {
              name: 'verifier_key',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            notary_key: {
              name: 'notary_key',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
            version: {
              name: 'version',
              restrictions: [
                {
                  cred_def_id: credentialDefinitionId,
                },
              ],
            },
          },
          requested_predicates: {},
          nonce: Math.floor(Math.random() * 1000000000).toString(),
        },
      },
    }

    return await this.proofRequests.sendProofRequest(proofRequest)
  }
}

export const credentialsAPI = new CredentialsAPI()

// Re-export everything for convenience
export {connectionsAPI} from './connections'
export {proofRequestsAPI} from './proof-requests'
export * from './types'
export * from './verification-processor'
export * from './verification-record'
export * from './verification-types'
