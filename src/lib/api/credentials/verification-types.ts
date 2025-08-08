/**
 * Shared types for verification system
 * Single source of truth for all verification-related types
 */

/**
 * Supported verification credential types
 */
export type VerificationType = 'age' | 'account'

/**
 * Configuration for different verification types
 */
export interface VerificationConfig {
  assertion: string
  types: string[]
  purposes: string[]
  expirationDate?: string
}

/**
 * Parameters for creating a verification record
 */
export interface CreateVerificationRecordParams {
  presExId: string
  proofRecord: any // The proof record from the verifier
  credentialType: VerificationType
}

/**
 * Status interface for each credential type
 */
export interface CredentialStatus<T = any> {
  verified: boolean
  verifiedAt: Date | null
  expirationDate: Date | null
  record: T | null
}

/**
 * Processed verification status for UI consumption
 */
export interface VerificationStatusMap<T = any> {
  age: CredentialStatus<T>
  account: CredentialStatus<T>
}
