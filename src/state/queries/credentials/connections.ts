import {useEffect} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {connectionsAPI} from '#/lib/api/credentials/connections'
import {useCredentialState} from '#/lib/hooks/useCredentialState'
import {usePolling} from '#/lib/hooks/usePolling'
import {connectionStorage} from '#/lib/storage/credentialStorage'
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
  const {
    data: connection,
    isLoading,
    updateData,
    setLoading,
    setErrorState,
  } = useCredentialState<any>(null)

  // Poll for connection status updates
  const {data: serverConnection} = useConnectionQuery(connectionId)

  // Load connection from storage
  useEffect(() => {
    const loadConnection = async () => {
      try {
        const storedConnection = await connectionStorage.getItem(connectionId)
        if (storedConnection) {
          updateData(storedConnection)
        }
      } catch (error) {
        logger.error('Failed to load connection from storage', {error})
        setErrorState('Failed to load connection from storage')
      } finally {
        setLoading(false)
      }
    }

    loadConnection()
  }, [connectionId, updateData, setLoading, setErrorState])

  // Update connection when server data changes
  useEffect(() => {
    if (!serverConnection) return

    // Only save to storage when connection becomes active
    if (serverConnection.state === 'active') {
      const connectionData = {
        connectionId: serverConnection.connection_id,
        status: 'active' as const,
        createdAt: serverConnection.created_at,
        updatedAt: serverConnection.updated_at,
      }

      updateData(connectionData)
      connectionStorage.saveItem(connectionId, connectionData)
    }
  }, [serverConnection, connectionId, updateData])

  // Use shared polling hook
  usePolling(connectionId, connection, ['active'], RQKEY_ROOT, 3000)

  return {
    connection,
    isLoading,
    updateConnection: updateData,
  }
}
