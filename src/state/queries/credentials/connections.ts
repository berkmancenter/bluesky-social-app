import {useEffect, useRef, useState} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {connectionsAPI} from '#/lib/api/credentials/connections'
import {logger} from '#/logger'

const RQKEY_ROOT = 'connections'
export const RQKEY = (key: string) => [RQKEY_ROOT, key]

const CONNECTION_STORAGE_KEY = 'bsky_credential_connections'

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
  const queryClient = useQueryClient()
  const [connection, setConnection] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Poll for connection status updates
  const {data: serverConnection} = useConnectionQuery(connectionId)
  const pollingIntervalRef = useRef<NodeJS.Timeout>()

  // Load connection from storage
  useEffect(() => {
    const loadConnection = async () => {
      try {
        const existingData = await AsyncStorage.getItem(CONNECTION_STORAGE_KEY)
        const connections = existingData ? JSON.parse(existingData) : {}
        const storedConnection = connections[connectionId]

        if (storedConnection) {
          setConnection(storedConnection)
        }
      } catch (error) {
        logger.error('Failed to load connection from storage', {error})
      } finally {
        setIsLoading(false)
      }
    }

    loadConnection()
  }, [connectionId])

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

      setConnection(connectionData)

      // Save to storage only when active
      const saveToStorage = async () => {
        try {
          const existingData = await AsyncStorage.getItem(
            CONNECTION_STORAGE_KEY,
          )
          const connections = existingData ? JSON.parse(existingData) : {}
          connections[connectionId] = connectionData
          await AsyncStorage.setItem(
            CONNECTION_STORAGE_KEY,
            JSON.stringify(connections),
          )
        } catch (error) {
          logger.error('Failed to save active connection to storage', {error})
        }
      }

      saveToStorage()
    }
  }, [serverConnection, connectionId])

  // Start polling if connection is still pending
  useEffect(() => {
    // Stop polling if server shows active, regardless of local connection state
    if (serverConnection?.state === 'active') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      return
    }

    // Start polling if we have a connection and it's not active, OR if we have a connectionId but no connection yet
    if (
      (connection && connection.status !== 'active') ||
      (connectionId && !connection)
    ) {
      pollingIntervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({queryKey: RQKEY(connectionId)})
      }, 3000) // Poll every 3 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
      }
    }
  }, [connection, connectionId, queryClient, serverConnection])

  return {
    connection,
    isLoading,
    updateConnection: setConnection,
  }
}
