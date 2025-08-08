import React from 'react'
import {useQuery, useQueryClient} from '@tanstack/react-query'

import {
  listVerificationRecords,
  type VerificationRecord,
} from '#/lib/api/credentials/verification-record'
import {logger} from '#/logger'
import {useAgent, useSession} from '#/state/session'

export const VERIFICATION_RECORDS_QUERY_KEY = ['verifiable-credentials-records']

/**
 * Pure data fetching hook for verification records
 * Only handles fetching, caching, and error handling
 */
export function useVerificationRecordsQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()

  return useQuery({
    queryKey: [...VERIFICATION_RECORDS_QUERY_KEY, currentAccount?.did],
    queryFn: async (): Promise<VerificationRecord[]> => {
      if (!currentAccount?.did) {
        logger.debug('useVerificationRecordsQuery: No current account DID')
        return []
      }

      try {
        const records = await listVerificationRecords(agent, currentAccount.did)
        logger.debug(
          'useVerificationRecordsQuery: Successfully fetched records',
          {
            userDid: currentAccount.did,
            recordCount: records.length,
          },
        )
        return records
      } catch (error) {
        logger.error('useVerificationRecordsQuery: Failed to fetch records', {
          error,
          userDid: currentAccount.did,
        })
        throw error
      }
    },
    enabled: !!currentAccount?.did,
    staleTime: 5 * 60 * 1000, // 5 minutes - records don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for session
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to invalidate verification records cache
 * Use after successful verification
 */
export function useInvalidateVerificationRecords() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return React.useCallback(() => {
    if (currentAccount?.did) {
      queryClient.invalidateQueries({
        queryKey: [...VERIFICATION_RECORDS_QUERY_KEY, currentAccount.did],
      })
    }
  }, [queryClient, currentAccount?.did])
}
