import {useEffect, useRef} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {createVerificationRecord} from '#/lib/api/credentials/verification-record'
import {ACCOUNT_CRED_DEF_ID, AGE_CRED_DEF_ID} from '#/lib/constants'
import {useCleanError} from '#/lib/hooks/useCleanError'
import {useCredentialState} from '#/lib/hooks/useCredentialState'
import {logger} from '#/logger'
import {
  usePersistentConnection,
  usePersistentProofRequest,
  useRequestAccountProofMutation,
  useRequestAgeProofMutation,
  useStartCredentialFlowMutation,
} from '#/state/queries/credentials'
import {PROFILE_VERIFICATION_RECORDS_QUERY_KEY} from '#/state/queries/credentials/useProfileVerificationStatus'
import {useInvalidateVerificationRecords} from '#/state/queries/credentials/useVerificationRecordsQuery'
import {useCurrentAccountProfile} from '#/state/queries/useCurrentAccountProfile'
import {useAgent, useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {CredentialVerifierQrCode} from '#/components/VerifiableCredentials/CredentialVerifierQrCode'

type CredentialData = {
  step: 'qr' | 'proof-request' | 'success' | 'error'
  invitationUrl: string
  connectionId: string
  presExId: string
}

const initialCredentialData: CredentialData = {
  step: 'qr',
  invitationUrl: '',
  connectionId: '',
  presExId: '',
}

export function Verify({config}: any) {
  const t = useTheme()
  const {_} = useLingui()
  const cleanError = useCleanError()
  const hasCreatedInvitation = useRef(false)
  const hasSentProofRequest = useRef(false)
  const hasCreatedPDSRecord = useRef(false)
  const hasTransitionedToProofRequest = useRef(false)
  const hasTransitionedToSuccess = useRef(false)
  const hasTransitionedToError = useRef(false)

  // ===== CREDENTIAL VERIFICATION FLOW =====
  // This component manages a 4-phase credential verification process:
  // 1. INITIAL SETUP: Generate connection invitation and QR code
  // 2. DATA FETCHING: Poll for connection and proof request status updates
  // 3. REACTIVE STATE MANAGEMENT: Handle server state changes and update UI
  // 4. AUTO-EXECUTION: Automatically send proof request when connection becomes active
  // ======================================

  // Use unified state management for all operations
  const {
    data: credentialData,
    error,
    setLoading,
    setErrorState,
    updateData,
  } = useCredentialState<CredentialData>(initialCredentialData)

  // Session data for PDS record creation
  const {currentAccount} = useSession()
  const profile = useCurrentAccountProfile()
  const agent = useAgent()

  // Credential flow mutation
  const startCredentialFlow = useStartCredentialFlowMutation()
  const requestAgeProof = useRequestAgeProofMutation()
  const requestAccountProof = useRequestAccountProofMutation()

  // Cache invalidation for verification records
  const invalidateVerificationRecords = useInvalidateVerificationRecords()
  const queryClient = useQueryClient()

  // ===== PHASE 1: INITIAL SETUP - Generate connection invitation =====
  useEffect(() => {
    const generateInvitation = async () => {
      try {
        if (hasCreatedInvitation.current) return
        hasCreatedInvitation.current = true
        setLoading(true)

        const invitation = await startCredentialFlow.mutateAsync(
          config.credentialType,
        )

        updateData({
          step: 'qr',
          invitationUrl: invitation.invitation_url,
          connectionId: invitation.connection_id,
          presExId: '',
        })
        setLoading(false) // Set loading to false when invitation is generated successfully
      } catch (invitationError) {
        logger.error(
          'VerifiableCredentialsDialog: Failed to generate connection invitation',
          {safeMessage: invitationError},
        )
        const {clean} = cleanError(invitationError)
        const errorMessage =
          clean ||
          _(msg`Failed to generate connection invitation, please try again.`)
        setErrorState(errorMessage)
      }
    }
    generateInvitation()
  }, [
    cleanError,
    _,
    config.credentialType,
    startCredentialFlow,
    setLoading,
    setErrorState,
    updateData,
  ])

  // ===== PHASE 2: DATA FETCHING - Poll for server state updates =====
  // Use persistent connection for polling status
  const {serverConnection} = usePersistentConnection(
    credentialData?.connectionId || '',
  )

  // Monitor proof request status
  const {serverProofRequest} = usePersistentProofRequest(
    credentialData?.presExId || '',
  )

  // ===== PHASE 3: REACTIVE STATE MANAGEMENT - Handle server state changes =====
  useEffect(() => {
    // Handle connection state changes (QR code scanned, connection being established)
    if (
      serverConnection?.state === 'response' &&
      credentialData?.step === 'qr' &&
      !hasTransitionedToProofRequest.current
    ) {
      hasTransitionedToProofRequest.current = true
      updateData({
        step: 'proof-request',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
    }

    // Handle proof request success states
    if (
      (serverProofRequest?.state === 'verified' ||
        serverProofRequest?.state === 'done') &&
      !hasTransitionedToSuccess.current
    ) {
      hasTransitionedToSuccess.current = true

      logger.info('Proof request completed successfully', {
        credentialType: config.credentialType,
        presExId: credentialData?.presExId,
        connectionId: credentialData?.connectionId,
        proofRequestState: serverProofRequest?.state,
        userDid: currentAccount?.did,
        userHandle: currentAccount?.handle,
        context: 'proof-verification-success',
      })

      updateData({
        step: 'success',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
      setLoading(false)

      // Create PDS verification record
      if (
        !hasCreatedPDSRecord.current &&
        credentialData?.presExId &&
        serverProofRequest
      ) {
        hasCreatedPDSRecord.current = true
        createVerificationRecord(
          {
            presExId: credentialData.presExId,
            proofRecord: serverProofRequest,
            credentialType: config.credentialType,
          },
          {
            currentAccount,
            profile,
            agent,
          },
        )
          .then(() => {
            // Invalidate verification records cache so UI updates immediately
            invalidateVerificationRecords()

            // Also invalidate profile verification caches for immediate badge updates
            queryClient.invalidateQueries({
              queryKey: PROFILE_VERIFICATION_RECORDS_QUERY_KEY,
            })

            logger.debug(
              'Invalidated verification caches after successful verification',
              {
                credentialType: config.credentialType,
                userDid: currentAccount?.did,
              },
            )
          })
          .catch(err => {
            logger.error('Failed to invalidate verification records cache', {
              error: err,
              credentialType: config.credentialType,
            })
          })
      }
    }

    // Handle proof request abandoned state
    if (
      serverProofRequest?.state === 'abandoned' &&
      !hasTransitionedToError.current
    ) {
      hasTransitionedToError.current = true

      logger.info('Proof request was rejected by user', {
        credentialType: config.credentialType,
        presExId: credentialData?.presExId,
        connectionId: credentialData?.connectionId,
        proofRequestState: serverProofRequest?.state,
        userDid: currentAccount?.did,
        context: 'user-rejected-proof-request',
      })

      updateData({
        step: 'error',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
      setErrorState('Rejected by the user')
      setLoading(false)
    }
  }, [
    serverConnection?.state,
    serverProofRequest?.state,
    serverProofRequest,
    credentialData,
    updateData,
    setLoading,
    setErrorState,
    config.credentialType,
    currentAccount,
    profile,
    agent,
    invalidateVerificationRecords,
    queryClient,
  ])

  // ===== PHASE 4: AUTO-EXECUTION - Send proof request when connection becomes active =====
  useEffect(() => {
    const sendProofRequest = async () => {
      if (
        serverConnection?.state === 'active' &&
        !hasSentProofRequest.current &&
        credentialData?.connectionId
      ) {
        try {
          hasSentProofRequest.current = true

          logger.info(
            'Connection established successfully, sending proof request',
            {
              credentialType: config.credentialType,
              connectionId: credentialData.connectionId,
              connectionState: serverConnection?.state,
              userDid: currentAccount?.did,
              userHandle: currentAccount?.handle,
              context: 'connection-active-proof-request-initiated',
            },
          )

          updateData({
            step: 'proof-request',
            invitationUrl: credentialData.invitationUrl,
            connectionId: credentialData.connectionId,
            presExId: credentialData.presExId,
          })

          // Determine credential definition and mutation based on type
          const credentialDefinitionId =
            config.credentialType === 'age'
              ? AGE_CRED_DEF_ID
              : ACCOUNT_CRED_DEF_ID

          const proofMutation =
            config.credentialType === 'age'
              ? requestAgeProof
              : requestAccountProof

          const proofResponse = await proofMutation.mutateAsync({
            connectionId: credentialData.connectionId,
            credentialDefinitionId,
          })

          updateData({
            step: 'proof-request', // Keep the step as proof-request until polling completes
            invitationUrl: credentialData.invitationUrl,
            connectionId: credentialData.connectionId,
            presExId: proofResponse.pres_ex_id,
          })

          logger.info('Proof request sent successfully', {
            presExId: proofResponse.pres_ex_id,
          })
        } catch (proofError) {
          logger.error('Failed to send proof request', {error: proofError})
          const errorMessage = _(
            msg`Failed to send proof request, please try again.`,
          )
          setErrorState(errorMessage)
        }
      }
    }

    sendProofRequest()
  }, [
    serverConnection?.state,
    credentialData,
    requestAgeProof,
    requestAccountProof,
    _,
    setErrorState,
    updateData,
    config.credentialType,
    currentAccount?.did,
    currentAccount?.handle,
  ])

  const getCredentialTitle = () => {
    switch (config.credentialType) {
      case 'age':
        return _(msg`Age Verification`)
      case 'account':
        return _(msg`Account Verification`)
      default:
        return _(msg`Credential Verification`)
    }
  }

  const getStepMessage = () => {
    switch (credentialData?.step) {
      case 'qr':
        return _(
          msg`Scan this QR code with your wallet to establish a secure connection.`,
        )
      case 'proof-request':
        return _(
          msg`Establishing connection and sending verification request...`,
        )
      case 'success':
        return _(msg`Age verification completed successfully!`)
      case 'error':
        return _(
          msg`The verification process was interrupted. Please try again.`,
        )
      default:
        return _(
          msg`Scan this QR code with your wallet to establish a secure connection.`,
        )
    }
  }

  return (
    <View style={{alignItems: 'center', width: '100%'}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}>
        <ShieldIcon
          size="lg"
          fill={t.palette.positive_600}
          style={{marginRight: 8}}
        />
        <Text style={[a.text_2xl, a.font_heavy, {textAlign: 'center'}]}>
          {getCredentialTitle()}
        </Text>
      </View>
      <Text
        style={[
          a.text_md,
          a.leading_snug,
          t.atoms.text_contrast_medium,
          {textAlign: 'center', marginBottom: 24},
        ]}>
        <Trans>{getStepMessage()}</Trans>
      </Text>
      {credentialData?.step === 'proof-request' ||
      (!credentialData?.invitationUrl && credentialData?.step === 'qr') ? (
        <View style={{marginVertical: 40, alignItems: 'center'}}>
          <Loader />
        </View>
      ) : credentialData?.step === 'success' ? (
        <View style={{marginVertical: 40, alignItems: 'center'}}>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              {textAlign: 'center', color: t.palette.positive_600},
            ]}>
            Verification Complete
          </Text>
        </View>
      ) : credentialData?.step === 'error' ? (
        <View style={{marginVertical: 40, alignItems: 'center'}}>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              {textAlign: 'center', color: t.palette.negative_600},
            ]}>
            Verification Failed
          </Text>
          <Text
            style={[
              a.text_md,
              t.atoms.text_contrast_medium,
              {textAlign: 'center', marginTop: 8},
            ]}>
            {error}
          </Text>
        </View>
      ) : (
        <>
          <Text
            style={[
              a.text_lg,
              a.font_bold,
              {textAlign: 'center', marginBottom: 20},
            ]}>
            Connect Your Wallet
          </Text>
          <CredentialVerifierQrCode
            invitationUrl={credentialData?.invitationUrl || ''}
          />
        </>
      )}

      <Text
        style={[
          a.text_sm,
          t.atoms.text_contrast_medium,
          {textAlign: 'center', marginTop: 24},
        ]}>
        <Trans>
          Don't have a wallet? You'll need to set one up first to use verifiable
          credentials.
        </Trans>
      </Text>
    </View>
  )
}
