import {useMutation} from '@tanstack/react-query'

import {credentialsAPI} from '#/lib/api/credentials'
import {logger} from '#/logger'

export function useStartCredentialFlowMutation() {
  return useMutation({
    mutationFn: async (credentialType: string) => {
      return await credentialsAPI.startCredentialFlow(credentialType)
    },
    onError: error => {
      logger.error('Failed to start credential flow', {error})
    },
  })
}

// Re-export everything for convenience
export {
  useConnectionQuery,
  useConnectionsQuery,
  useCreateConnectionInvitationMutation,
  usePersistentConnection,
} from './connections'
export {
  usePersistentProofRequest,
  useProofRecordQuery,
  useProofRecordsQuery,
  useRequestAccountProofMutation,
  useRequestAgeProofMutation,
} from './proof-requests'
