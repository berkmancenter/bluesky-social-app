/**
 * Pure business logic for processing verification records
 */

import {type VerificationRecord} from './verification-record'
import {
  type CredentialStatus,
  type VerificationStatusMap,
  type VerificationType,
} from './verification-types'

/**
 * Business logic for verification records
 */
export const VerificationProcessor = {
  /**
   * Validate if a record has the required structure to be considered verified
   */
  isValidRecord(record: VerificationRecord): boolean {
    return !!(
      record.rkey && // Record exists in PDS
      record.credential?.hash && // Has cryptographic proof
      record.createdAt // Has valid timestamp
    )
  },

  /**
   * Extract credential type from record's type array
   */
  extractCredentialType(record: VerificationRecord): VerificationType | null {
    const type = record.credential?.type

    if (!Array.isArray(type)) {
      return null
    }

    if (type.includes('AgeVerification')) {
      return 'age'
    } else if (type.includes('AccountVerification')) {
      return 'account'
    }

    return null
  },

  /**
   * Create a CredentialStatus from a valid record
   */
  createStatusFromRecord(record: VerificationRecord): CredentialStatus {
    const verifiedAt = record.createdAt ? new Date(record.createdAt) : null
    const expirationDate = record.credential?.expirationDate
      ? new Date(record.credential.expirationDate)
      : null

    return {
      verified: true, // If we're calling this, record is already validated
      verifiedAt,
      expirationDate,
      record,
    }
  },

  /**
   * Create an empty (unverified) status for a credential type
   */
  createEmptyStatus(): CredentialStatus {
    return {
      verified: false,
      verifiedAt: null,
      expirationDate: null,
      record: null,
    }
  },

  /**
   * Process raw records (directly from the PDS) into UI-friendly verification status
   * Uses the most recent valid record for each credential type
   */
  processRecords(records: VerificationRecord[]): VerificationStatusMap {
    const byType = records.reduce(
      (acc, record) => {
        const credentialType = this.extractCredentialType(record)

        if (!credentialType || !this.isValidRecord(record)) {
          return acc
        }

        const status = this.createStatusFromRecord(record)
        const existing = acc[credentialType]

        // Use the most recent valid record for each type
        if (
          !existing ||
          (status.verifiedAt &&
            (!existing.verifiedAt || status.verifiedAt > existing.verifiedAt))
        ) {
          acc[credentialType] = status
        }

        return acc
      },
      {} as Partial<Record<VerificationType, CredentialStatus>>,
    )

    // Ensure all credential types are present
    return {
      age: byType.age || this.createEmptyStatus(),
      account: byType.account || this.createEmptyStatus(),
    }
  },

  /**
   * Get verification statistics, helper function for debugging or future needs
   */
  getVerificationStats(status: VerificationStatusMap): {
    hasAnyVerification: boolean
    verificationCount: number
    verifiedTypes: VerificationType[]
  } {
    const verifiedTypes: VerificationType[] = []

    if (status.age.verified) verifiedTypes.push('age')
    if (status.account.verified) verifiedTypes.push('account')

    return {
      hasAnyVerification: verifiedTypes.length > 0,
      verificationCount: verifiedTypes.length,
      verifiedTypes,
    }
  },

  /**
   * Check if a specific credential type is verified
   */
  isCredentialVerified(
    status: VerificationStatusMap,
    type: VerificationType,
  ): boolean {
    return status[type].verified
  },

  /**
   * Get the most recent verification date across all credentials
   */
  getMostRecentVerificationDate(status: VerificationStatusMap): Date | null {
    const dates = [status.age.verifiedAt, status.account.verifiedAt].filter(
      (date): date is Date => date !== null,
    )

    if (dates.length === 0) return null

    return new Date(Math.max(...dates.map(d => d.getTime())))
  },

  /**
   * Extract screen_name from account verification record
   * Returns the stored screen_name from the credential object
   */
  extractScreenNameFromAccountRecord(
    record: VerificationRecord,
  ): string | null {
    try {
      return record.credential?.screenName || null
    } catch (error) {
      return null
    }
  },
}
