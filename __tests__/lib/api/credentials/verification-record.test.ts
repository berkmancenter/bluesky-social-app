import {beforeEach, describe, expect, it, jest} from '@jest/globals'

import {
  createVerificationRecord,
  getVerificationRecord,
  listVerificationRecords,
} from '#/lib/api/credentials/verification-record'
import {logger} from '#/logger'

// Mock dependencies
jest.mock('#/logger')
jest.mock('js-sha256', () => ({
  sha256: jest.fn(() => 'mocked-sha256-hash'),
}))

const mockLogger = logger as jest.Mocked<typeof logger>

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('VerificationRecord API', () => {
  const mockAgent = {
    com: {
      atproto: {
        repo: {
          createRecord: jest.fn() as jest.MockedFunction<any>,
        },
      },
    },
    api: {
      com: {
        atproto: {
          repo: {
            listRecords: jest.fn() as jest.MockedFunction<any>,
            getRecord: jest.fn() as jest.MockedFunction<any>,
          },
        },
      },
    },
    session: {
      did: 'did:plc:test123',
    },
  }

  const mockSessionData = {
    currentAccount: {
      did: 'did:plc:test123',
      handle: 'test.user.bsky.social',
    },
    profile: {
      displayName: 'Test User',
    },
    agent: mockAgent,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger.info.mockImplementation(() => {})
    mockLogger.error.mockImplementation(() => {})
    mockLogger.warn.mockImplementation(() => {})
    mockLogger.debug.mockImplementation(() => {})
  })

  describe('createVerificationRecord', () => {
    it('should create verification record successfully', async () => {
      const mockProofRecord = {
        pres_ex_id: 'test-pres-123',
        state: 'done',
        pres: {
          'presentations~attach': [
            {
              data: {
                base64: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
              },
            },
          ],
        },
        by_format: {
          pres: {
            anoncreds: {
              requested_proof: {
                revealed_attrs: {
                  expiry_dateint: {raw: '20250115', encoded: '20250115'},
                },
              },
            },
          },
        },
      }

      const mockCreateRecordResponse = {
        uri: 'at://did:plc:test123/app.bsky.graph.verification/abc123',
        cid: 'bafyrei123',
        commit: {
          cid: 'bafyrei456',
          rev: '3jqfcqzm2sq2m',
        },
      }

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue(
        mockCreateRecordResponse,
      )

      const params = {
        presExId: 'test-pres-123',
        proofRecord: mockProofRecord,
        credentialType: 'age' as const,
      }

      const result = await createVerificationRecord(params, mockSessionData)

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: 'did:plc:test123',
        collection: 'app.bsky.graph.verification',
        record: expect.objectContaining({
          handle: 'test.user.bsky.social',
          displayName: 'Test User',
          subject: 'did:plc:test123',
          assertion: expect.stringContaining('21 years of age'),
          createdAt: expect.any(String),
          credential: expect.objectContaining({
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
            expirationDate: expect.any(String), // Dynamic expiration date
            hash: 'mocked-sha256-hash',
            uri: expect.stringContaining(
              'present-proof-2.0/records/test-pres-123',
            ),
          }),
        }),
      })

      expect(result).toEqual(
        expect.objectContaining({
          handle: 'test.user.bsky.social',
          displayName: 'Test User',
          uri: 'at://did:plc:test123/app.bsky.graph.verification/abc123',
          cid: 'bafyrei123',
        }),
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Verification record created successfully on PDS',
        expect.objectContaining({
          credentialType: 'age',
          presExId: 'test-pres-123',
        }),
      )
    })

    it('should handle account verification type', async () => {
      const mockProofRecord = {
        pres_ex_id: 'test-pres-456',
        state: 'done',
        pres: {
          'presentations~attach': [
            {
              data: {
                base64: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
              },
            },
          ],
        },
        by_format: {
          pres: {
            anoncreds: {
              requested_proof: {
                revealed_attrs: {},
              },
            },
          },
        },
      }

      mockAgent.com.atproto.repo.createRecord.mockResolvedValue({
        data: {
          uri: 'at://did:plc:test123/app.bsky.graph.verification/def456',
          cid: 'bafyrei789',
        },
      })

      const params = {
        presExId: 'test-pres-456',
        proofRecord: mockProofRecord,
        credentialType: 'account' as const,
      }

      const result = await createVerificationRecord(params, mockSessionData)

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
        repo: 'did:plc:test123',
        collection: 'app.bsky.graph.verification',
        record: expect.objectContaining({
          handle: 'test.user.bsky.social',
          displayName: 'Test User',
          subject: 'did:plc:test123',
          assertion: expect.stringContaining('verified account'),
          createdAt: expect.any(String),
          credential: expect.objectContaining({
            type: ['VerifiableCredential', 'AnonCred', 'AccountVerification'],
            purpose: ['AccountOwnership'],
            expirationDate: expect.any(String), // Dynamic expiration date
            hash: 'mocked-sha256-hash',
            uri: expect.stringContaining(
              'present-proof-2.0/records/test-pres-456',
            ),
          }),
        }),
      })

      // The function actually generates dynamic expiration dates even for account verification
      expect(result.credential.expirationDate).toEqual(expect.any(String))
    })

    it('should handle PDS creation errors', async () => {
      const mockError = new Error('PDS server error')
      mockAgent.com.atproto.repo.createRecord.mockRejectedValue(mockError)

      const params = {
        presExId: 'test-pres-123',
        proofRecord: {
          state: 'done',
          pres: {
            'presentations~attach': [
              {
                data: {
                  base64: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                },
              },
            ],
          },
        },
        credentialType: 'age' as const,
      }

      await expect(
        createVerificationRecord(params, mockSessionData),
      ).rejects.toThrow('PDS server error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create verification record on PDS',
        expect.objectContaining({
          error: mockError,
          credentialType: 'age',
        }),
      )
    })
  })

  describe('listVerificationRecords', () => {
    it('should list verification records successfully', async () => {
      const mockRecords = [
        {
          uri: 'at://did:plc:test123/app.bsky.graph.verification/rec1',
          cid: 'bafyrei123',
          value: {
            handle: 'test.user.bsky.social',
            displayName: 'Test User',
            subject: 'did:plc:test123',
            assertion: 'I assert that I am over 21 years of age',
            createdAt: '2024-01-15T10:30:00Z',
            credential: {
              type: ['VerifiableCredential', 'AgeVerification'],
              expirationDate: '2025-01-15T00:00:00Z',
            },
          },
        },
        {
          uri: 'at://did:plc:test123/app.bsky.graph.verification/rec2',
          cid: 'bafyrei456',
          value: {
            handle: 'test.user.bsky.social',
            displayName: 'Test User',
            subject: 'did:plc:test123',
            assertion: 'I assert that this is my verified account',
            createdAt: '2024-01-20T14:00:00Z',
            credential: {
              type: ['VerifiableCredential', 'AccountVerification'],
            },
          },
        },
      ]

      mockAgent.api.com.atproto.repo.listRecords.mockResolvedValue({
        data: {
          records: mockRecords,
        },
      })

      const result = await listVerificationRecords(mockAgent, 'did:plc:test123')

      expect(mockAgent.api.com.atproto.repo.listRecords).toHaveBeenCalledWith({
        repo: 'did:plc:test123',
        collection: 'app.bsky.graph.verification',
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(
        expect.objectContaining({
          handle: 'test.user.bsky.social',
          uri: 'at://did:plc:test123/app.bsky.graph.verification/rec1',
          rkey: 'rec1',
        }),
      )
      expect(result[1]).toEqual(
        expect.objectContaining({
          handle: 'test.user.bsky.social',
          uri: 'at://did:plc:test123/app.bsky.graph.verification/rec2',
          rkey: 'rec2',
        }),
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Listed verification records from PDS',
        expect.objectContaining({
          userDid: 'did:plc:test123',
          count: 2,
        }),
      )
    })

    it('should handle empty records list', async () => {
      mockAgent.api.com.atproto.repo.listRecords.mockResolvedValue({
        data: {
          records: [],
        },
      })

      const result = await listVerificationRecords(mockAgent, 'did:plc:test123')

      expect(result).toEqual([])
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Listed verification records from PDS',
        expect.objectContaining({
          count: 0,
        }),
      )
    })

    it('should handle listRecords errors gracefully', async () => {
      const mockError = new Error('Network error')
      mockAgent.api.com.atproto.repo.listRecords.mockRejectedValue(mockError)

      const result = await listVerificationRecords(mockAgent, 'did:plc:test123')

      expect(result).toEqual([])
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list verification records from PDS',
        expect.objectContaining({
          error: mockError,
          userDid: 'did:plc:test123',
        }),
      )
    })
  })

  describe('getVerificationRecord', () => {
    it('should get specific verification record', async () => {
      const mockRecord = {
        uri: 'at://did:plc:test123/app.bsky.graph.verification/rec1',
        cid: 'bafyrei123',
        value: {
          handle: 'test.user.bsky.social',
          subject: 'did:plc:test123',
          credential: {
            type: ['VerifiableCredential', 'AgeVerification'],
          },
        },
      }

      mockAgent.api.com.atproto.repo.getRecord.mockResolvedValue({
        data: mockRecord,
      })

      const result = await getVerificationRecord(
        mockAgent,
        'did:plc:test123',
        'rec1',
      )

      expect(mockAgent.api.com.atproto.repo.getRecord).toHaveBeenCalledWith({
        repo: 'did:plc:test123',
        collection: 'app.bsky.graph.verification',
        rkey: 'rec1',
      })

      expect(result).toEqual(
        expect.objectContaining({
          handle: 'test.user.bsky.social',
          uri: 'at://did:plc:test123/app.bsky.graph.verification/rec1',
          rkey: 'rec1',
        }),
      )
    })

    it('should return null for non-existent record', async () => {
      mockAgent.api.com.atproto.repo.getRecord.mockRejectedValue(
        new Error('Record not found'),
      )

      const result = await getVerificationRecord(
        mockAgent,
        'did:plc:test123',
        'nonexistent',
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get verification record from PDS',
        expect.objectContaining({
          userDid: 'did:plc:test123',
          rkey: 'nonexistent',
        }),
      )
    })
  })
})
