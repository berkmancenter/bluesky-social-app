import {useEffect} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {credentialsAPI} from '#/lib/api/credentials'
import {proofRequestsAPI} from '#/lib/api/credentials/proof-requests'
import {useCredentialState} from '#/lib/hooks/useCredentialState'
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
  const {
    data: proofRequest,
    isLoading,
    updateData,
    setLoading,
    setErrorState,
  } = useCredentialState<any>(null)

  // Poll for proof request status updates
  const {data: serverProofRequest} = useProofRecordQuery(presExId)

  // Load proof request from storage
  useEffect(() => {
    const loadProofRequest = async () => {
      try {
        const storedProofRequest = await proofRequestStorage.getItem(presExId)
        if (storedProofRequest) {
          updateData(storedProofRequest)
        }
      } catch (error) {
        logger.error('Failed to load proof request from storage', {error})
        setErrorState('Failed to load proof request from storage')
      } finally {
        setLoading(false)
      }
    }

    loadProofRequest()
  }, [presExId, updateData, setLoading, setErrorState])

  // Update proof request when server data changes
  useEffect(() => {
    if (!serverProofRequest) return

    // Save to storage when proof request is verified
    if (
      serverProofRequest.state === 'verified' ||
      serverProofRequest.state === 'done'
    ) {
      const proofRequestData = {
        presExId: serverProofRequest.pres_ex_id,
        status: serverProofRequest.state,
        createdAt: serverProofRequest.created_at,
        updatedAt: serverProofRequest.updated_at,
      }

      updateData(proofRequestData)

      // Save to storage using the shared function
      saveProofRequestToStorage(serverProofRequest)
    }
  }, [serverProofRequest, presExId, updateData])

  // Use shared polling hook
  usePolling(presExId, proofRequest, ['verified', 'done'], RQKEY_ROOT, 3000)

  return {
    proofRequest,
    isLoading,
    serverProofRequest,
  }
}
