import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {credentialsAPI} from '#/lib/api/credentials'
import {proofRequestsAPI} from '#/lib/api/credentials/proof-requests'
import {usePolling} from '#/lib/hooks/usePolling'
import {proofRequestStorage} from '#/lib/storage/credentialStorage'
import {logger} from '#/logger'

const RQKEY_ROOT = 'proof-requests'
export const RQKEY = (key: string) => [RQKEY_ROOT, key]

async function saveProofRequestToStorage(proofRequestData: any) {
  const data = {
    presExId: proofRequestData.pres_ex_id,
    status: proofRequestData.state,
    createdAt: proofRequestData.created_at,
    updatedAt: proofRequestData.updated_at,
  }
  await proofRequestStorage.saveItem(proofRequestData.pres_ex_id, data)
}

export function useRequestAgeProofMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      connectionId,
      credentialDefinitionId,
    }: {
      connectionId: string
      credentialDefinitionId: string
    }) => {
      return await credentialsAPI.requestAgeProof(
        connectionId,
        credentialDefinitionId,
      )
    },
    onSuccess: async data => {
      // Save to storage
      await saveProofRequestToStorage(data)
      // Invalidate and refetch proof records
      queryClient.invalidateQueries({queryKey: RQKEY('list')})
    },
    onError: error => {
      logger.error('Failed to request age proof', {error})
    },
  })
}

export function useProofRecordsQuery() {
  return useQuery({
    queryKey: RQKEY('list'),
    queryFn: async () => {
      return await proofRequestsAPI.getProofRecords()
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
  })
}

export function useProofRecordQuery(presExId: string) {
  return useQuery({
    queryKey: RQKEY(presExId),
    queryFn: async () => {
      return await proofRequestsAPI.getProofRecord(presExId)
    },
    enabled: !!presExId,
    staleTime: 30 * 1000,
    retry: 3,
  })
}

export function usePersistentProofRequest(presExId: string) {
  // Poll for proof request status updates
  const {data: serverProofRequest} = useProofRecordQuery(presExId)

  // Use shared polling hook - include 'abandoned' as a final state
  usePolling(
    presExId,
    serverProofRequest,
    ['verified', 'done', 'abandoned'],
    RQKEY_ROOT,
    3000,
  )

  return {
    serverProofRequest,
  }
}
