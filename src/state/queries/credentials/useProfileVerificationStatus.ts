import React from 'react'
import {useQuery} from '@tanstack/react-query'

import {VerificationProcessor} from '#/lib/api/credentials/verification-processor'
import {
  listVerificationRecords,
  type VerificationRecord,
} from '#/lib/api/credentials/verification-record'
import {type VerificationStatusMap} from '#/lib/api/credentials/verification-types'
import {logger} from '#/logger'
import {useAgent} from '#/state/session'

export const PROFILE_VERIFICATION_RECORDS_QUERY_KEY = [
  'profile-verification-records',
]

/**
 * Hook to get verification status for any profile DID
 * Unlike useVerificationStatus, this can fetch records for any user
 */
export function useProfileVerificationStatus(profileDid?: string) {
  const agent = useAgent()

  const {
    data: records = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [...PROFILE_VERIFICATION_RECORDS_QUERY_KEY, profileDid],
    queryFn: async (): Promise<VerificationRecord[]> => {
      if (!profileDid) {
        logger.debug('useProfileVerificationStatus: No profile DID provided')
        return []
      }

      try {
        const fetchedRecords = await listVerificationRecords(agent, profileDid)
        logger.debug(
          'useProfileVerificationStatus: Successfully fetched records',
          {
            profileDid,
            recordCount: fetchedRecords.length,
          },
        )
        return fetchedRecords
      } catch (fetchError) {
        logger.debug('useProfileVerificationStatus: Failed to fetch records', {
          error: fetchError,
          profileDid,
        })
        // return empty array on error instead of throwing
        // allows profiles without verification to display normally
        return []
      }
    },
    enabled: !!profileDid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Less aggressive retry for profile queries
    retryDelay: 1000, // Wait 1 second before retrying
  })

  // Process raw records
  const status = React.useMemo((): VerificationStatusMap => {
    return VerificationProcessor.processRecords(records)
  }, [records])

  // Calculate stats
  const stats = React.useMemo(() => {
    return VerificationProcessor.getVerificationStats(status)
  }, [status])

  return {
    status,
    records,
    isLoading,
    error,
    isAgeVerified: stats.verifiedTypes.includes('age'),
    isAccountVerified: stats.verifiedTypes.includes('account'),
    hasAnyVerification: stats.hasAnyVerification,
    verificationCount: stats.verificationCount,
  }
}
