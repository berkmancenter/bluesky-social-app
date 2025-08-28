import {beforeEach, describe, expect, it, jest} from '@jest/globals'

import {proofRequestsAPI} from '#/lib/api/credentials/proof-requests'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('ProofRequestsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendProofRequest', () => {
    it('should send proof request successfully', async () => {
      const mockResponse = {
        pres_ex_id: 'test-proof-123',
        state: 'request-sent',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const proofRequest = {
        connection_id: 'test-connection-123',
        anoncreds: {
          cred_def_id: 'test-cred-def-123',
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
                    cred_def_id: 'test-cred-def-123',
                  },
                ],
              },
            },
            requested_predicates: {
              age_verification: {
                name: 'date_of_birth',
                p_type: '<=',
                p_value: 20060101,
                restrictions: [
                  {
                    cred_def_id: 'test-cred-def-123',
                  },
                ],
              },
            },
            nonce: '123456789',
          },
        },
      }

      const result = await proofRequestsAPI.sendProofRequest(proofRequest)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://verifier-server.asml.berkmancenter.org/present-proof-2.0/send-request',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(proofRequest),
        },
      )

      expect(result).toEqual(mockResponse)
      expect(result.pres_ex_id).toBe('test-proof-123')
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      })

      const proofRequest = {
        connection_id: 'test-connection-123',
        anoncreds: {cred_def_id: 'test-cred-def-123'},
        presentation_request: {
          anoncreds: {
            name: 'test',
            version: '1.0',
            requested_attributes: {},
            requested_predicates: {},
            nonce: 'test',
          },
        },
      }

      await expect(
        proofRequestsAPI.sendProofRequest(proofRequest),
      ).rejects.toThrow('Failed to send proof request: Internal Server Error')
    })
  })

  describe('getProofRecords', () => {
    it('should get proof records successfully', async () => {
      const mockResponse = {
        results: [
          {
            pres_ex_id: 'proof-1',
            state: 'verified',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await proofRequestsAPI.getProofRecords()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://verifier-server.asml.berkmancenter.org/present-proof-2.0/records',
      )

      expect(result).toEqual(mockResponse)
      expect(result.results).toHaveLength(1)
    })
  })

  describe('getProofRecord', () => {
    it('should get specific proof record successfully', async () => {
      const presExId = 'test-proof-123'
      const mockResponse = {
        pres_ex_id: presExId,
        state: 'verified',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await proofRequestsAPI.getProofRecord(presExId)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://verifier-server.asml.berkmancenter.org/present-proof-2.0/records/${presExId}`,
      )

      expect(result).toEqual(mockResponse)
      expect(result.pres_ex_id).toBe(presExId)
    })
  })
})
