import {beforeEach, describe, expect, it} from '@jest/globals'

import {VerificationProcessor} from '#/lib/api/credentials/verification-processor'
import {type VerificationRecord} from '#/lib/api/credentials/verification-record'

describe('VerificationProcessor', () => {
  // VerificationProcessor is a static object, not a class
  const processor = VerificationProcessor

  beforeEach(() => {
    // No setup needed since processor is a static object
  })

  describe('processRecords', () => {
    it('should process mixed verification records correctly', () => {
      const records: VerificationRecord[] = [
        {
          handle: 'alice.bsky.social',
          displayName: 'Alice Johnson',
          subject: 'did:plc:alice123',
          assertion: 'I assert that I am over 18 years of age',
          createdAt: '2024-01-15T10:30:00Z',
          credential: {
            uri: 'https://verifier.example.com/proof/age123',
            hash: 'sha256:abc123',
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
            expirationDate: '2025-01-15T00:00:00Z',
          },
          uri: 'at://did:plc:alice123/app.bsky.graph.verification/age1',
          cid: 'bafyreiabc123',
          rkey: 'age1',
        },
        {
          handle: 'alice.bsky.social',
          displayName: 'Alice Johnson',
          subject: 'did:plc:alice123',
          assertion: 'I assert that this is my verified account',
          createdAt: '2024-01-20T14:00:00Z',
          credential: {
            uri: 'https://verifier.example.com/proof/account456',
            hash: 'sha256:def456',
            type: ['VerifiableCredential', 'AnonCred', 'AccountVerification'],
            purpose: ['AccountOwnership'],
          },
          uri: 'at://did:plc:alice123/app.bsky.graph.verification/account1',
          cid: 'bafyreidef456',
          rkey: 'account1',
        },
      ]

      const result = processor.processRecords(records)

      expect(result).toEqual({
        age: {
          verified: true,
          verifiedAt: new Date('2024-01-15T10:30:00Z'),
          expirationDate: new Date('2025-01-15T00:00:00Z'),
          record: records[0],
        },
        account: {
          verified: true,
          verifiedAt: new Date('2024-01-20T14:00:00Z'),
          expirationDate: null,
          record: records[1],
        },
      })
    })

    it('should handle duplicate records and keep most recent', () => {
      const records: VerificationRecord[] = [
        {
          handle: 'bob.bsky.social',
          displayName: 'Bob Smith',
          subject: 'did:plc:bob123',
          assertion: 'I assert that I am over 18 years of age',
          createdAt: '2024-01-10T08:00:00Z', // Older
          credential: {
            uri: 'https://verifier.example.com/proof/age1',
            hash: 'sha256:old123',
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
            expirationDate: '2025-01-10T00:00:00Z',
          },
          uri: 'at://did:plc:bob123/app.bsky.graph.verification/age1',
          rkey: 'age1', // Required for validation
        },
        {
          handle: 'bob.bsky.social',
          displayName: 'Bob Smith',
          subject: 'did:plc:bob123',
          assertion: 'I assert that I am over 18 years of age',
          createdAt: '2024-01-20T10:00:00Z', // Newer
          credential: {
            uri: 'https://verifier.example.com/proof/age2',
            hash: 'sha256:new456',
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
            expirationDate: '2025-01-20T00:00:00Z',
          },
          uri: 'at://did:plc:bob123/app.bsky.graph.verification/age2',
          rkey: 'age2', // Required for validation
        },
      ]

      const result = processor.processRecords(records)

      // Should keep the newer record
      expect(result.age.verifiedAt).toEqual(new Date('2024-01-20T10:00:00Z'))
      expect(result.age.expirationDate).toEqual(
        new Date('2025-01-20T00:00:00Z'),
      )
      expect(result.age.record).toBe(records[1])
    })

    it('should create empty status for missing credential types', () => {
      const records: VerificationRecord[] = [
        // Only age verification, no account verification
        {
          handle: 'charlie.bsky.social',
          displayName: 'Charlie Brown',
          subject: 'did:plc:charlie123',
          assertion: 'I assert that I am over 21 years of age',
          createdAt: '2024-01-15T12:00:00Z',
          credential: {
            uri: 'https://verifier.example.com/proof/age123',
            hash: 'sha256:charlie123',
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
          },
          uri: 'at://did:plc:charlie123/app.bsky.graph.verification/age1',
          rkey: 'age1', // Required for validation
        },
      ]

      const result = processor.processRecords(records)

      expect(result.age.verified).toBe(true)
      expect(result.account).toEqual({
        verified: false,
        verifiedAt: null,
        expirationDate: null,
        record: null,
      })
    })

    it('should handle empty records array', () => {
      const result = processor.processRecords([])

      expect(result).toEqual({
        age: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
        account: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
      })
    })

    it('should filter out invalid records', () => {
      const records: VerificationRecord[] = [
        // Valid record
        {
          handle: 'valid.bsky.social',
          displayName: 'Valid User',
          subject: 'did:plc:valid123',
          assertion: 'I assert that I am over 18 years of age',
          createdAt: '2024-01-15T12:00:00Z',
          credential: {
            uri: 'https://verifier.example.com/proof/valid123',
            hash: 'sha256:valid123',
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
          },
          uri: 'at://did:plc:valid123/app.bsky.graph.verification/age1',
          rkey: 'age1', // Required for validation
        },
        // Invalid record (missing rkey and hash)
        {
          handle: 'invalid.bsky.social',
          displayName: 'Invalid User',
          subject: 'did:plc:invalid123',
          assertion: 'I assert that I am over 18 years of age',
          createdAt: '2024-01-15T12:00:00Z',
          credential: {
            uri: 'https://verifier.example.com/proof/invalid123',
            // hash: 'missing', // Missing hash makes it invalid
            type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
            purpose: ['ProofOfMajorityAge'],
          } as any, // Use 'as any' to bypass TypeScript for intentionally invalid test data
          uri: 'at://did:plc:invalid123/app.bsky.graph.verification/age2',
          // rkey: 'missing', // Missing rkey makes it invalid
        },
      ]

      const result = processor.processRecords(records)

      // Should only process the valid record
      expect(result.age.verified).toBe(true)
      expect(result.age.record).toBe(records[0])
    })
  })

  describe('getVerificationStats', () => {
    it('should calculate statistics correctly', () => {
      const status = {
        age: {
          verified: true,
          verifiedAt: new Date('2024-01-15T10:30:00Z'),
          expirationDate: new Date('2025-01-15T00:00:00Z'),
          record: {} as any,
        },
        account: {
          verified: true,
          verifiedAt: new Date('2024-01-20T14:00:00Z'),
          expirationDate: null,
          record: {} as any,
        },
      }

      const result = processor.getVerificationStats(status)

      expect(result).toEqual({
        hasAnyVerification: true,
        verificationCount: 2,
        verifiedTypes: ['age', 'account'],
      })
    })

    it('should handle no verifications', () => {
      const status = {
        age: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
        account: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
      }

      const result = processor.getVerificationStats(status)

      expect(result).toEqual({
        hasAnyVerification: false,
        verificationCount: 0,
        verifiedTypes: [],
      })
    })

    it('should handle partial verifications', () => {
      const status = {
        age: {
          verified: true,
          verifiedAt: new Date('2024-01-15T10:30:00Z'),
          expirationDate: new Date('2025-01-15T00:00:00Z'),
          record: {} as any,
        },
        account: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
      }

      const result = processor.getVerificationStats(status)

      expect(result).toEqual({
        hasAnyVerification: true,
        verificationCount: 1,
        verifiedTypes: ['age'],
      })
    })
  })

  describe('isCredentialVerified', () => {
    const mockStatus = {
      age: {
        verified: true,
        verifiedAt: new Date('2024-01-15T10:30:00Z'),
        expirationDate: new Date('2025-01-15T00:00:00Z'),
        record: {} as any,
      },
      account: {
        verified: false,
        verifiedAt: null,
        expirationDate: null,
        record: null,
      },
    }

    it('should return true for verified credentials', () => {
      const result = processor.isCredentialVerified(mockStatus, 'age')
      expect(result).toBe(true)
    })

    it('should return false for unverified credentials', () => {
      const result = processor.isCredentialVerified(mockStatus, 'account')
      expect(result).toBe(false)
    })
  })

  describe('getMostRecentVerificationDate', () => {
    it('should return most recent verification date', () => {
      const status = {
        age: {
          verified: true,
          verifiedAt: new Date('2024-01-15T10:30:00Z'), // Older
          expirationDate: new Date('2025-01-15T00:00:00Z'),
          record: {} as any,
        },
        account: {
          verified: true,
          verifiedAt: new Date('2024-01-20T14:00:00Z'), // Newer
          expirationDate: null,
          record: {} as any,
        },
      }

      const result = processor.getMostRecentVerificationDate(status)
      expect(result).toEqual(new Date('2024-01-20T14:00:00Z'))
    })

    it('should return null when no verifications exist', () => {
      const status = {
        age: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
        account: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
      }

      const result = processor.getMostRecentVerificationDate(status)
      expect(result).toBeNull()
    })

    it('should handle mixed verification states', () => {
      const status = {
        age: {
          verified: true,
          verifiedAt: new Date('2024-01-15T10:30:00Z'),
          expirationDate: new Date('2025-01-15T00:00:00Z'),
          record: {} as any,
        },
        account: {
          verified: false,
          verifiedAt: null,
          expirationDate: null,
          record: null,
        },
      }

      const result = processor.getMostRecentVerificationDate(status)
      expect(result).toEqual(new Date('2024-01-15T10:30:00Z'))
    })
  })

  describe('createStatusFromRecord', () => {
    it('should create status from valid record', () => {
      const record: VerificationRecord = {
        handle: 'test.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that I am over 18 years of age',
        createdAt: '2024-01-15T10:30:00Z',
        credential: {
          uri: 'https://verifier.example.com/proof/test123',
          hash: 'sha256:test123',
          type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
          purpose: ['ProofOfMajorityAge'],
          expirationDate: '2025-01-15T00:00:00Z',
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/test1',
      }

      const result = processor.createStatusFromRecord(record)

      expect(result).toEqual({
        verified: true,
        verifiedAt: new Date('2024-01-15T10:30:00Z'),
        expirationDate: new Date('2025-01-15T00:00:00Z'),
        record,
      })
    })

    it('should handle record without expiration date', () => {
      const record: VerificationRecord = {
        handle: 'test.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that this is my verified account',
        createdAt: '2024-01-20T14:00:00Z',
        credential: {
          uri: 'https://verifier.example.com/proof/account123',
          hash: 'sha256:account123',
          type: ['VerifiableCredential', 'AnonCred', 'AccountVerification'],
          purpose: ['AccountOwnership'],
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/account1',
      }

      const result = processor.createStatusFromRecord(record)

      expect(result).toEqual({
        verified: true,
        verifiedAt: new Date('2024-01-20T14:00:00Z'),
        expirationDate: null,
        record,
      })
    })

    it('should handle malformed dates gracefully', () => {
      const record: VerificationRecord = {
        handle: 'test.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that I am over 18 years of age',
        createdAt: 'invalid-date',
        credential: {
          uri: 'https://verifier.example.com/proof/test123',
          hash: 'sha256:test123',
          type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
          purpose: ['ProofOfMajorityAge'],
          expirationDate: 'invalid-expiry',
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/test1',
      }

      const result = processor.createStatusFromRecord(record)

      expect(result.verified).toBe(true)
      // The implementation returns Date { NaN } for invalid dates, not null
      expect(result.verifiedAt).toBeInstanceOf(Date)
      expect(isNaN(result.verifiedAt!.getTime())).toBe(true)
      expect(result.expirationDate).toBeInstanceOf(Date)
      expect(isNaN(result.expirationDate!.getTime())).toBe(true)
      expect(result.record).toBe(record)
    })
  })
})
