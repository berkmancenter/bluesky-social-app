import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {connectionsAPI} from '#/lib/api/credentials/connections'
import {usePolling} from '#/lib/hooks/usePolling'
import {logger} from '#/logger'

const RQKEY_ROOT = 'connections'
export const RQKEY = (key: string) => [RQKEY_ROOT, key]

export function useCreateConnectionInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (metadata?: any) => {
      return await connectionsAPI.createInvitation(metadata)
    },
    onSuccess: async () => {
      // Invalidate and refetch connections
      queryClient.invalidateQueries({queryKey: RQKEY('list')})
    },
    onError: error => {
      logger.error('Failed to create connection invitation', {error})
    },
  })
}

export function useConnectionsQuery() {
  return useQuery({
    queryKey: RQKEY('list'),
    queryFn: async () => {
      return await connectionsAPI.getConnections()
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
  })
}

export function useConnectionQuery(connectionId: string) {
  return useQuery({
    queryKey: RQKEY(connectionId),
    queryFn: async () => {
      return await connectionsAPI.getConnection(connectionId)
    },
    enabled: !!connectionId,
    staleTime: 30 * 1000,
    retry: 3,
  })
}

export function usePersistentConnection(connectionId: string) {
  // Poll for connection status updates
  const {data: serverConnection} = useConnectionQuery(connectionId)

  // Use shared polling hook
  usePolling(connectionId, serverConnection, ['active'], RQKEY_ROOT, 1000)

  return {
    serverConnection,
  }
}
