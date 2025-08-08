import {beforeEach, describe, expect, it, jest} from '@jest/globals'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {renderHook, waitFor} from '@testing-library/react'
import type React from 'react'

import * as useVerificationRecordsQuery from '#/state/queries/credentials/useVerificationRecordsQuery'
import {useVerificationStatus} from '#/state/queries/credentials/useVerificationStatus'
import * as useSession from '#/state/session'

// Mock dependencies
jest.mock('#/state/queries/credentials/useVerificationRecordsQuery')
jest.mock('#/state/session')
jest.mock('#/logger')

const mockUseVerificationRecordsQuery =
  useVerificationRecordsQuery as jest.Mocked<typeof useVerificationRecordsQuery>
const mockUseSession = useSession as jest.Mocked<typeof useSession>

describe('useVerificationStatus', () => {
  let queryClient: QueryClient
  let wrapper: React.FC<{children: React.ReactNode}>

  const mockCurrentAccount = {
    did: 'did:plc:test123',
    handle: 'test.user.bsky.social',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    wrapper = ({children}) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    jest.clearAllMocks()

    // Mock session
    mockUseSession.useSession.mockReturnValue({
      currentAccount: mockCurrentAccount,
    } as any)

    // Mock invalidation hook
    mockUseVerificationRecordsQuery.useInvalidateVerificationRecords.mockReturnValue(
      jest.fn(),
    )
  })

  it('should return verification status with processed records', async () => {
    const mockRecords = [
      {
        handle: 'test.user.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that I am over 21 years of age',
        createdAt: '2024-01-15T10:30:00Z',
        credential: {
          uri: 'https://verifier.example.com/proof/age123',
          hash: 'sha256:abc123',
          type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
          purpose: ['ProofOfMajorityAge'],
          expirationDate: '2025-01-15T00:00:00Z',
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/age1',
        cid: 'bafyreiabc123',
        rkey: 'age1',
      },
      {
        handle: 'test.user.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that this is my verified account',
        createdAt: '2024-01-20T14:00:00Z',
        credential: {
          uri: 'https://verifier.example.com/proof/account456',
          hash: 'sha256:def456',
          type: ['VerifiableCredential', 'AnonCred', 'AccountVerification'],
          purpose: ['AccountOwnership'],
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/account1',
        cid: 'bafyreidef456',
        rkey: 'account1',
      },
    ]

    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: mockRecords,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check processed status
    expect(result.current.status.age.verified).toBe(true)
    expect(result.current.status.age.verifiedAt).toEqual(
      new Date('2024-01-15T10:30:00Z'),
    )
    expect(result.current.status.account.verified).toBe(true)
    expect(result.current.status.account.verifiedAt).toEqual(
      new Date('2024-01-20T14:00:00Z'),
    )

    // Check statistics
    expect(result.current.hasAnyVerification).toBe(true)
    expect(result.current.verificationCount).toBe(2)
    expect(result.current.verifiedTypes).toEqual(['age', 'account'])

    // Check convenience flags
    expect(result.current.isAgeVerified).toBe(true)
    expect(result.current.isAccountVerified).toBe(true)

    // Check most recent date
    expect(result.current.mostRecentVerificationDate).toEqual(
      new Date('2024-01-20T14:00:00Z'),
    )

    // Check actions are available
    expect(result.current.actions.refreshFromPDS).toBeInstanceOf(Function)
    expect(result.current.actions.invalidateCache).toBeInstanceOf(Function)
  })

  it('should handle empty records correctly', async () => {
    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check empty status
    expect(result.current.status.age.verified).toBe(false)
    expect(result.current.status.account.verified).toBe(false)

    // Check statistics
    expect(result.current.hasAnyVerification).toBe(false)
    expect(result.current.verificationCount).toBe(0)
    expect(result.current.verifiedTypes).toEqual([])

    // Check convenience flags
    expect(result.current.isAgeVerified).toBe(false)
    expect(result.current.isAccountVerified).toBe(false)

    // Check most recent date
    expect(result.current.mostRecentVerificationDate).toBeNull()
  })

  it('should handle loading state correctly', () => {
    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    expect(result.current.isLoading).toBe(true)
    expect(result.current.status.age.verified).toBe(false)
    expect(result.current.status.account.verified).toBe(false)
  })

  it('should handle error state correctly', () => {
    const mockError = new Error('Failed to fetch records')

    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: [],
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    expect(result.current.error).toBe(mockError)
    expect(result.current.isLoading).toBe(false)
  })

  it('should call refreshFromPDS action correctly', async () => {
    const mockInvalidateQueries = jest.fn()
    queryClient.invalidateQueries = mockInvalidateQueries

    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Call refreshFromPDS action
    result.current.actions.refreshFromPDS()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['verifiable-credentials-records', 'did:plc:test123'],
    })
  })

  it('should call invalidateCache action correctly', async () => {
    const mockInvalidateCache = jest.fn()
    mockUseVerificationRecordsQuery.useInvalidateVerificationRecords.mockReturnValue(
      mockInvalidateCache,
    )

    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Call invalidateCache action
    result.current.actions.invalidateCache()

    expect(mockInvalidateCache).toHaveBeenCalled()
  })

  it('should memoize actions correctly', async () => {
    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result, rerender} = renderHook(() => useVerificationStatus(), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const firstActions = result.current.actions

    // Re-render without changing dependencies
    rerender()

    const secondActions = result.current.actions

    // Actions should be the same reference (memoized)
    expect(firstActions).toBe(secondActions)
  })

  it('should handle partial verification states', async () => {
    const mockRecords = [
      {
        handle: 'test.user.bsky.social',
        displayName: 'Test User',
        subject: 'did:plc:test123',
        assertion: 'I assert that I am over 21 years of age',
        createdAt: '2024-01-15T10:30:00Z',
        credential: {
          uri: 'https://verifier.example.com/proof/age123',
          hash: 'sha256:abc123',
          type: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
          purpose: ['ProofOfMajorityAge'],
          expirationDate: '2025-01-15T00:00:00Z',
        },
        uri: 'at://did:plc:test123/app.bsky.graph.verification/age1',
      },
      // No account verification record
    ]

    mockUseVerificationRecordsQuery.useVerificationRecordsQuery.mockReturnValue(
      {
        data: mockRecords,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any,
    )

    const {result} = renderHook(() => useVerificationStatus(), {wrapper})

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAgeVerified).toBe(true)
    expect(result.current.isAccountVerified).toBe(false)
    expect(result.current.hasAnyVerification).toBe(true)
    expect(result.current.verificationCount).toBe(1)
    expect(result.current.verifiedTypes).toEqual(['age'])
  })
})
