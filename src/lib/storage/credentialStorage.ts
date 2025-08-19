import AsyncStorage from '@react-native-async-storage/async-storage'

import {logger} from '#/logger'

export class CredentialStorage<T> {
  constructor(private storageKey: string) {}

  async saveItem(key: string, data: T): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(this.storageKey)
      const items = existingData ? JSON.parse(existingData) : {}
      items[key] = data
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(items))
    } catch (error) {
      logger.error(`Failed to save ${this.storageKey} item`, {error})
    }
  }

  async getItem(key: string): Promise<T | null> {
    try {
      const existingData = await AsyncStorage.getItem(this.storageKey)
      const items = existingData ? JSON.parse(existingData) : {}
      return items[key] || null
    } catch (error) {
      logger.error(`Failed to get ${this.storageKey} item`, {error})
      return null
    }
  }

  async getAllItems(): Promise<Record<string, T>> {
    try {
      const existingData = await AsyncStorage.getItem(this.storageKey)
      return existingData ? JSON.parse(existingData) : {}
    } catch (error) {
      logger.error(`Failed to get all ${this.storageKey} items`, {error})
      return {}
    }
  }
}

// Create specific instances
export const proofRequestStorage = new CredentialStorage('bsky_proof_requests')
export const connectionStorage = new CredentialStorage(
  'bsky_credential_connections',
)
