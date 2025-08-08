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
    // Calculate 21+ age threshold
    const year = new Date().getFullYear()
    const twentyOneYearsAgo = new Date()
    twentyOneYearsAgo.setFullYear(year - 21)

    // Calculate threshold in YYYYMMDD format
    const twentyOneThreshold = parseInt(
      twentyOneYearsAgo.getFullYear() +
        String(twentyOneYearsAgo.getMonth() + 1).padStart(2, '0') +
        String(twentyOneYearsAgo.getDate()).padStart(2, '0'),
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
              p_value: twentyOneThreshold,
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
}

export const credentialsAPI = new CredentialsAPI()

// Re-export everything for convenience
export {connectionsAPI} from './connections'
export {proofRequestsAPI} from './proof-requests'
export * from './types'
export * from './verification-processor'
export * from './verification-record'
export * from './verification-types'
