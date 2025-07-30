import {CREDENTIAL_VERIFIER_ENDPOINT} from '#/lib/constants'
import {
  type ProofRecord,
  type ProofRequest,
  type ProofRequestResponse,
} from './types'

class ProofRequestsAPI {
  private baseUrl = CREDENTIAL_VERIFIER_ENDPOINT

  async sendProofRequest(
    proofRequest: ProofRequest,
  ): Promise<ProofRequestResponse> {
    const response = await fetch(
      `${this.baseUrl}/present-proof-2.0/send-request`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(proofRequest),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to send proof request: ${response.statusText}`)
    }

    return response.json()
  }

  async getProofRecords(): Promise<{results: ProofRecord[]}> {
    const response = await fetch(`${this.baseUrl}/present-proof-2.0/records`)

    if (!response.ok) {
      throw new Error(`Failed to get proof records: ${response.statusText}`)
    }

    return response.json()
  }

  async getProofRecord(presExId: string): Promise<ProofRecord> {
    const response = await fetch(
      `${this.baseUrl}/present-proof-2.0/records/${presExId}`,
    )

    if (!response.ok) {
      throw new Error(`Failed to get proof record: ${response.statusText}`)
    }

    return response.json()
  }
}

export const proofRequestsAPI = new ProofRequestsAPI()
