import React from 'react'
import {useQueryClient} from '@tanstack/react-query'

import {VerificationProcessor} from '#/lib/api/credentials/verification-processor'
import {
  type VerificationStatusMap,
  type VerificationType,
} from '#/lib/api/credentials/verification-types'
import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {
  useInvalidateVerificationRecords,
  useVerificationRecordsQuery,
  VERIFICATION_RECORDS_QUERY_KEY,
} from './useVerificationRecordsQuery'

/**
 * Actions available for verification management
 */
export interface VerificationActions {
  refreshFromPDS: () => void
  invalidateCache: () => void
}

/**
 * Complete verification status with helpers and actions
 */
export interface VerificationStatusResult {
  // Core status data
  status: VerificationStatusMap
  records: any[] // Raw records for debugging

  // Loading states
  isLoading: boolean
  error: Error | null

  // Statistics and helpers
  hasAnyVerification: boolean
  verificationCount: number
  verifiedTypes: VerificationType[]
  mostRecentVerificationDate: Date | null

  // Actions
  actions: VerificationActions

  // Individual credential helpers
  isAgeVerified: boolean
  isAccountVerified: boolean
}

/**
 * Main hook for UI components to get verification status
 * Combines data fetching with business logic
 */
export function useVerificationStatus(): VerificationStatusResult {
  const {data: records = [], isLoading, error} = useVerificationRecordsQuery()
  const invalidateCache = useInvalidateVerificationRecords()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  // Process raw records (directly from the PDS)
  const status = React.useMemo(() => {
    return VerificationProcessor.processRecords(records)
  }, [records])

  // Calculate stats
  const stats = React.useMemo(() => {
    return VerificationProcessor.getVerificationStats(status)
  }, [status])

  // Get most recent verification date
  const mostRecentVerificationDate = React.useMemo(() => {
    return VerificationProcessor.getMostRecentVerificationDate(status)
  }, [status])

  // Helper to manually refresh data from PDS
  const refreshFromPDS = React.useCallback(() => {
    if (currentAccount?.did) {
      queryClient.invalidateQueries({
        queryKey: [...VERIFICATION_RECORDS_QUERY_KEY, currentAccount.did],
      })
    }
  }, [queryClient, currentAccount?.did])

  // Actions object
  const actions = React.useMemo(
    (): VerificationActions => ({
      refreshFromPDS,
      invalidateCache,
    }),
    [refreshFromPDS, invalidateCache],
  )

  // Log when verification status changes (useful for debugging)
  React.useEffect(() => {
    if (records.length > 0 && stats.hasAnyVerification) {
      logger.info('User has verified credentials', {
        userDid: currentAccount?.did,
        verifiedTypes: stats.verifiedTypes,
        totalRecords: records.length,
        verificationCount: stats.verificationCount,
      })
    }
  }, [
    stats.hasAnyVerification,
    stats.verifiedTypes,
    stats.verificationCount,
    records.length,
    currentAccount?.did,
  ])

  return {
    // Core data
    status,
    records,

    // Loading states
    isLoading,
    error,

    // Statistics
    hasAnyVerification: stats.hasAnyVerification,
    verificationCount: stats.verificationCount,
    verifiedTypes: stats.verifiedTypes,
    mostRecentVerificationDate,

    // Actions
    actions,

    // Individual credential helpers
    isAgeVerified: VerificationProcessor.isCredentialVerified(status, 'age'),
    isAccountVerified: VerificationProcessor.isCredentialVerified(
      status,
      'account',
    ),
  }
}

/**
 * Simplified hook for basic verification checks
 * Use when you only need to know if credentials are verified
 */
export function useVerificationCheck() {
  const {isAgeVerified, isAccountVerified, hasAnyVerification, isLoading} =
    useVerificationStatus()

  return {
    isAgeVerified,
    isAccountVerified,
    hasAnyVerification,
    isLoading,
  }
}

/**
 * Hook focused on a specific credential type
 * Use when component only cares about one type of verification
 */
export function useCredentialStatus(type: VerificationType) {
  const {status, isLoading, error, actions} = useVerificationStatus()

  const credentialStatus = status[type]
  const isVerified = React.useMemo(
    () => VerificationProcessor.isCredentialVerified(status, type),
    [status, type],
  )

  return {
    status: credentialStatus,
    isVerified,
    isLoading,
    error,
    actions,
  }
}

// Re-export types for convenience
export type {
  CredentialStatus,
  VerificationStatusMap,
  VerificationType,
} from '#/lib/api/credentials/verification-types'
