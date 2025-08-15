/**
 * TypeScript interfaces for Bluesky PDS verification records
 * Extends app.bsky.graph.verification with custom credential data
 */

import {sha256} from 'js-sha256'

import {DEFAULT_SERVICE} from '#/lib/constants'
import {logger} from '#/logger'
import {
  type CreateVerificationRecordParams,
  type VerificationConfig,
  type VerificationType,
} from './verification-types'

// Main verification record interface (what gets stored on PDS)
export interface VerificationRecord {
  handle: string
  displayName: string
  subject: string // User's DID
  assertion: string // Dynamic based on verification type
  createdAt: string
  credential: CredentialData
  // PDS metadata (populated after record creation). Adding this for debugging purposes.
  uri?: string // AT URI of the record
  cid?: string // Content identifier
  rkey?: string // Record key
  commit?: {
    cid: string
    rev: string
  }
}

// Credential data interface (the new extension)
export interface CredentialData {
  uri: string // URL to the proof record
  hash: string // SHA-256 hash of the cryptographic proof
  type: string[] // ['VerifiableCredential', 'AgeVerification']
  purpose: string[] // ['ProofOfMajorityAge', 'AccountVerification']
  expirationDate?: string // Optional ISO date string
  screenName?: string // For account verification: extracted from proof
}

// Individual verification configurations
const AGE_VERIFICATION_CONFIG: VerificationConfig = {
  assertion: 'I assert that I am over 21 years of age',
  types: ['VerifiableCredential', 'AnonCred', 'AgeVerification'],
  purposes: ['ProofOfMajorityAge'],
}

const ACCOUNT_VERIFICATION_CONFIG: VerificationConfig = {
  assertion: 'I assert that this is my verified account',
  types: ['VerifiableCredential', 'AnonCred', 'AccountVerification'],
  purposes: ['AccountOwnership'],
}

// Function to get configuration for a verification type
export function getVerificationConfig(
  type: VerificationType,
): VerificationConfig {
  switch (type) {
    case 'age':
      return AGE_VERIFICATION_CONFIG
    case 'account':
      return ACCOUNT_VERIFICATION_CONFIG
    default:
      throw new Error(`Unsupported verification type: ${type}`)
  }
}
//TODO: Extract all revealed attributes from the proof record that corresponds to the TLS revealed attributes
/**
 * Extract screen_name from the proof record for account verification
 */
function extractScreenNameFromProof(proofRecord: any): string | undefined {
  try {
    // Navigate the proof structure to find revealed attributes
    const proofData = proofRecord.by_format?.pres

    if (!proofData) {
      logger.warn(
        'No proof data found in by_format.pres for screen_name extraction',
      )
      return undefined
    }

    // Look for the proof format (usually anoncreds or similar)
    const formatKeys = Object.keys(proofData)
    if (formatKeys.length === 0) {
      logger.warn(
        'No format keys found in proof data for screen_name extraction',
      )
      return undefined
    }

    // Get the first format (assuming anoncreds)
    const formatData = proofData[formatKeys[0]]
    const revealedAttrs = formatData?.requested_proof?.revealed_attrs

    if (!revealedAttrs) {
      logger.warn(
        'No revealed attributes found in proof for screen_name extraction',
      )
      return undefined
    }

    // Look for screen_name in revealed attributes
    const screenNameAttr = revealedAttrs.screen_name
    if (!screenNameAttr) {
      logger.warn('No screen_name attribute found in revealed attributes', {
        availableAttributes: Object.keys(revealedAttrs),
      })
      return undefined
    }

    // Extract the raw value
    const rawScreenName = screenNameAttr.raw
    if (!rawScreenName) {
      logger.warn('No raw screen_name value found')
      return undefined
    }

    logger.info('Successfully extracted screen_name from proof', {
      screenName: rawScreenName,
    })

    return rawScreenName.toString()
  } catch (error) {
    logger.error('Error extracting screen_name from proof', {error})
    return undefined
  }
}

/**
 * Extract expiry date from the proof record for age verification (MDL)
 * For age verification, we extract the actual expiry_date from the shared credential
 */
function extractExpiryDateFromProof(proofRecord: any): string | undefined {
  try {
    // Navigate the proof structure to find revealed attributes
    const proofData = proofRecord.by_format?.pres

    if (!proofData) {
      logger.warn('No proof data found in by_format.pres')
      return undefined
    }

    // Look for the proof format (usually anoncreds or similar)
    const formatKeys = Object.keys(proofData)
    if (formatKeys.length === 0) {
      logger.warn('No format keys found in proof data')
      return undefined
    }

    // Get the first format (assuming anoncreds)
    const formatData = proofData[formatKeys[0]]
    const revealedAttrs = formatData?.requested_proof?.revealed_attrs

    if (!revealedAttrs) {
      logger.warn('No revealed attributes found in proof')
      return undefined
    }

    // Look for expiry_date in revealed attributes (correct property name)
    const expiryAttr = revealedAttrs.expiry_date
    if (!expiryAttr) {
      logger.warn('No expiry_date attribute found in revealed attributes', {
        availableAttributes: Object.keys(revealedAttrs),
      })
      return undefined
    }

    // Extract the raw value (should be in YYYY-MM-DD format)
    const rawExpiryDate = expiryAttr.raw
    if (!rawExpiryDate) {
      logger.warn('No raw expiry date value found')
      return undefined
    }

    // Validate and convert YYYY-MM-DD to ISO date string
    const dateStr = rawExpiryDate.toString()

    // Check if it's already in YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) {
      logger.warn('Invalid expiry date format, expected YYYY-MM-DD', {
        rawDate: dateStr,
      })
      return undefined
    }

    // Convert to ISO date string (set to end of day)
    const isoDate = new Date(`${dateStr}T23:59:59.999Z`).toISOString()

    return isoDate
  } catch (error) {
    logger.error('Error extracting expiry date from proof', {
      error: error,
      proofStructure: {
        hasByFormat: !!proofRecord.by_format,
        hasPresFormat: !!proofRecord.by_format?.pres,
        byFormatKeys: proofRecord.by_format
          ? Object.keys(proofRecord.by_format)
          : [],
        presKeys: proofRecord.by_format?.pres
          ? Object.keys(proofRecord.by_format.pres)
          : [],
      },
    })
    return undefined
  }
}

// Function to extract expiration date from proof record
export function getExpirationDate(
  credentialType: VerificationType,
  proofRecord: any,
): string | undefined {
  // Different credential types may have different expiration logic
  switch (credentialType) {
    case 'age':
      // For age verification, extract the actual expiry date from the MDL credential
      const extractedDate = extractExpiryDateFromProof(proofRecord)
      if (extractedDate) {
        return extractedDate
      }

      // Fallback: Age verification expires after 1 year if we can't extract from credential
      logger.warn(
        'Could not extract expiry date from MDL credential, using fallback of 1 year',
      )
      const now = new Date()
      const expirationDate = new Date(now)
      expirationDate.setFullYear(now.getFullYear() + 1)
      return expirationDate.toISOString()

    case 'account':
      // Account verification expires in 1 year
      const accountNow = new Date()
      const accountExpiration = new Date(accountNow)
      accountExpiration.setFullYear(accountNow.getFullYear() + 1)
      return accountExpiration.toISOString()

    default:
      // No expiration by default
      return undefined
  }
}

/**
 * Generate the direct PDS URL for viewing a verification record
 */
export function getVerificationRecordUrl(
  pdsUrl: string,
  userDid: string,
  rkey: string,
): string {
  const baseUrl = pdsUrl.replace(/\/$/, '') // Remove trailing slash
  return `${baseUrl}/xrpc/com.atproto.repo.getRecord?repo=${userDid}&collection=app.bsky.graph.verification&rkey=${rkey}`
}

/**
 * Create a verification record on the Bluesky PDS
 * This extends app.bsky.graph.verification with custom credential data
 */
export async function createVerificationRecord(
  params: CreateVerificationRecordParams,
  sessionData: {
    currentAccount: any
    profile: any
    agent: any
  },
): Promise<VerificationRecord> {
  // Validate required data
  if (!sessionData.currentAccount?.did) {
    throw new Error('No authenticated user found')
  }

  if (!sessionData.currentAccount?.handle) {
    throw new Error('User handle not available')
  }

  // Extract the base64 proof data for hashing
  const base64ProofData =
    params.proofRecord.pres?.['presentations~attach']?.[0]?.data?.base64
  if (!base64ProofData) {
    throw new Error('No cryptographic proof found in the verification record')
  }

  // Get verification-specific configuration
  const config = getVerificationConfig(params.credentialType)
  const expirationDate = getExpirationDate(
    params.credentialType,
    params.proofRecord,
  )

  // Extract screen_name for account verification
  const screenName =
    params.credentialType === 'account'
      ? extractScreenNameFromProof(params.proofRecord)
      : undefined

  // Build the verification record
  const record: VerificationRecord = {
    handle: sessionData.currentAccount.handle,
    displayName: sessionData.profile?.displayName || '',
    subject: sessionData.currentAccount.did,
    assertion: config.assertion,
    createdAt: new Date().toISOString(),
    credential: {
      uri: `https://verifier-server.asml.berkmancenter.org/present-proof-2.0/records/${params.presExId}`,
      hash: sha256(base64ProofData),
      type: config.types,
      purpose: config.purposes,
      expirationDate,
      screenName, // Include screen_name in credential for account verification
    },
  }

  // Create the record on the PDS
  try {
    const response = await sessionData.agent.com.atproto.repo.createRecord({
      repo: sessionData.agent.session?.did,
      collection: 'app.bsky.graph.verification',
      record,
    })

    // Extract URI and CID from response (handle both direct and data-wrapped responses)
    const uri = response?.uri || response?.data?.uri
    const cid = response?.cid || response?.data?.cid
    const commit = response?.commit || response?.data?.commit

    let rkey: string | undefined

    if (uri && typeof uri === 'string') {
      rkey = uri.split('/').pop() // Last segment is the rkey
    }

    // Add PDS metadata to the record
    const recordWithMetadata: VerificationRecord = {
      ...record,
      uri: uri,
      cid: cid,
      rkey: rkey,
      commit: commit,
    }

    // Generate the direct PDS URL for viewing
    const pdsViewUrl = rkey
      ? getVerificationRecordUrl(
          DEFAULT_SERVICE,
          sessionData.currentAccount.did,
          rkey,
        )
      : undefined

    logger.info('Verification record created successfully on PDS', {
      credentialType: params.credentialType,
      presExId: params.presExId,
      atUri: uri, // Full AT:// URI
      cid: cid,
      rkey: rkey,
      pdsViewUrl: pdsViewUrl, // Direct link to view the record
      commit: commit,
      credentialUri: record.credential.uri,
      credentialExpirationDate: record.credential.expirationDate,
      proofHash: record.credential.hash.substring(0, 8) + '...', // Only log first 8 chars of hash
      handle: record.handle,
      assertion: record.assertion,
    })

    return recordWithMetadata
  } catch (error) {
    logger.error('Failed to create verification record on PDS', {
      error: error,
      credentialType: params.credentialType,
      presExId: params.presExId,
      userDid: sessionData.currentAccount?.did,
      userHandle: sessionData.currentAccount?.handle,
    })
    throw new Error(`Failed to create verification record: ${error}`)
  }
}

/**
 * Get a specific verification record from the PDS
 */
export async function getVerificationRecord(
  agent: any,
  userDid: string,
  rkey: string,
): Promise<VerificationRecord | null> {
  try {
    const response = await agent.api.com.atproto.repo.getRecord({
      repo: userDid,
      collection: 'app.bsky.graph.verification',
      rkey: rkey,
    })

    const record = response?.data || response

    logger.info('Retrieved verification record from PDS', {
      uri: record.uri,
      cid: record.cid,
      rkey: rkey,
      handle: record.value?.handle,
      assertion: record.value?.assertion,
      credentialType: record.value?.credential?.type,
      createdAt: record.value?.createdAt,
      expirationDate: record.value?.credential?.expirationDate,
    })

    return {
      ...record.value,
      uri: record.uri,
      cid: record.cid,
      rkey: rkey,
    }
  } catch (error) {
    logger.error('Failed to get verification record from PDS', {
      error: error,
      userDid: userDid,
      rkey: rkey,
    })
    return null
  }
}

/**
 * List all verification records for a user
 */
export async function listVerificationRecords(
  agent: any,
  userDid: string,
): Promise<VerificationRecord[]> {
  try {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: userDid,
      collection: 'app.bsky.graph.verification',
    })

    const records = (response?.data?.records || response?.records || []).map(
      (record: any) => {
        const uri = record.uri
        const rkey = uri ? uri.split('/').pop() : undefined

        return {
          ...record.value,
          uri: record.uri,
          cid: record.cid,
          rkey: rkey,
        }
      },
    )

    logger.info('Listed verification records from PDS', {
      userDid: userDid,
      count: records.length,
      records: records.map((r: any) => ({
        rkey: r.rkey,
        handle: r.handle,
        assertion: r.assertion,
        createdAt: r.createdAt,
        expirationDate: r.credential?.expirationDate,
      })),
    })

    return records
  } catch (error) {
    logger.error('Failed to list verification records from PDS', {
      error: error,
      userDid: userDid,
    })
    return []
  }
}
