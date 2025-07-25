import {beforeEach, describe, expect, it, jest} from '@jest/globals'

import {connectionsAPI} from '#/lib/api/credentials/connections'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('ConnectionsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createInvitation', () => {
    it('should create invitation successfully', async () => {
      const mockResponse = {
        connection_id: 'test-connection-123',
        invitation: {
          '@type': 'https://didcomm.org/connections/1.0/invitation',
          '@id': 'test-invitation-id',
          label: 'Test Verifier',
          recipientKeys: ['test-key-1'],
          serviceEndpoint: 'https://verifier-server.asml.berkmancenter.org',
        },
        invitation_url:
          'https://verifier-server.asml.berkmancenter.org?c_i=test-invitation-url',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await connectionsAPI.createInvitation()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://verifier-server.asml.berkmancenter.org/connections/create-invitation',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({}),
        },
      )

      expect(result).toEqual(mockResponse)
      expect(result.connection_id).toBe('test-connection-123')
      expect(result.invitation_url).toBeDefined()
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      })

      await expect(connectionsAPI.createInvitation()).rejects.toThrow(
        'Failed to create invitation: Internal Server Error',
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(connectionsAPI.createInvitation()).rejects.toThrow(
        'Network error',
      )
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(connectionsAPI.createInvitation()).rejects.toThrow(
        'Invalid JSON',
      )
    })
  })

  describe('getConnection', () => {
    it('should get connection status successfully', async () => {
      const connectionId = 'test-connection-123'
      const mockResponse = {
        connection_id: connectionId,
        state: 'active',
        their_label: 'Test Wallet',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await connectionsAPI.getConnection(connectionId)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://verifier-server.asml.berkmancenter.org/connections/${connectionId}`,
      )

      expect(result).toEqual(mockResponse)
      expect(result.connection_id).toBe(connectionId)
      expect(result.state).toBe('active')
    })

    it('should handle connection not found', async () => {
      const connectionId = 'non-existent-connection'

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(connectionsAPI.getConnection(connectionId)).rejects.toThrow(
        'Failed to get connection: Not Found',
      )
    })

    it('should handle network errors when getting connection', async () => {
      const connectionId = 'test-connection-123'

      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(connectionsAPI.getConnection(connectionId)).rejects.toThrow(
        'Network error',
      )
    })
  })

  describe('getConnections', () => {
    it('should get all connections successfully', async () => {
      const mockResponse = {
        results: [
          {
            connection_id: 'connection-1',
            state: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            connection_id: 'connection-2',
            state: 'pending',
            created_at: '2024-01-01T01:00:00Z',
            updated_at: '2024-01-01T01:00:00Z',
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await connectionsAPI.getConnections()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://verifier-server.asml.berkmancenter.org/connections',
      )

      expect(result).toEqual(mockResponse)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].connection_id).toBe('connection-1')
      expect(result.results[1].connection_id).toBe('connection-2')
    })

    it('should handle empty connections list', async () => {
      const mockResponse = {
        results: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await connectionsAPI.getConnections()

      expect(result.results).toHaveLength(0)
    })

    it('should handle server errors when getting connections', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
      })

      await expect(connectionsAPI.getConnections()).rejects.toThrow(
        'Failed to get connections: Server Error',
      )
    })
  })

  describe('API Endpoint Configuration', () => {
    it('should use correct base URL', () => {
      // Test that the API uses the correct endpoint
      expect(connectionsAPI).toBeDefined()

      const mockResponse = {
        connection_id: 'test-123',
        invitation: {},
        invitation_url: 'https://example.com/invite',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      connectionsAPI.createInvitation()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://verifier-server.asml.berkmancenter.org',
        ),
        expect.any(Object),
      )
    })
  })

  describe('Request Headers and Body', () => {
    it('should send correct headers for POST requests', async () => {
      const mockResponse = {
        connection_id: 'test-123',
        invitation: {},
        invitation_url: 'https://example.com/invite',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await connectionsAPI.createInvitation()

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      })
    })

    it('should send correct headers for GET requests', async () => {
      const mockResponse = {
        connection_id: 'test-123',
        state: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await connectionsAPI.getConnection('test-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        // GET requests don't have a second parameter
      )
    })
  })

  describe('Error Response Handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(connectionsAPI.createInvitation()).rejects.toThrow(
        'Failed to create invitation: Bad Request',
      )
    })

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(connectionsAPI.getConnection('test-123')).rejects.toThrow(
        'Failed to get connection: Unauthorized',
      )
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(
        connectionsAPI.getConnection('non-existent'),
      ).rejects.toThrow('Failed to get connection: Not Found')
    })

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(connectionsAPI.getConnections()).rejects.toThrow(
        'Failed to get connections: Internal Server Error',
      )
    })
  })
})
