import {useEffect, useRef} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {AGE_CRED_DEF_ID} from '#/lib/constants'
import {useCleanError} from '#/lib/hooks/useCleanError'
import {useCredentialState} from '#/lib/hooks/useCredentialState'
import {logger} from '#/logger'
import {
  usePersistentConnection,
  usePersistentProofRequest,
  useRequestAgeProofMutation,
  useStartCredentialFlowMutation,
} from '#/state/queries/credentials'
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

  // Credential flow mutation
  const startCredentialFlow = useStartCredentialFlowMutation()
  const requestAgeProof = useRequestAgeProofMutation()

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
      } catch (error) {
        logger.error(
          'VerifiableCredentialsDialog: Failed to generate connection invitation',
          {safeMessage: error},
        )
        const {clean} = cleanError(error)
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
      credentialData?.step === 'qr'
    ) {
      updateData({
        step: 'proof-request',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
    }

    // Handle proof request success states
    if (
      serverProofRequest?.state === 'verified' ||
      serverProofRequest?.state === 'done'
    ) {
      updateData({
        step: 'success',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
      setLoading(false)
    }

    // Handle proof request abandoned state
    if (serverProofRequest?.state === 'abandoned') {
      updateData({
        step: 'error',
        invitationUrl: credentialData?.invitationUrl || '',
        connectionId: credentialData?.connectionId || '',
        presExId: credentialData?.presExId || '',
      })
      setErrorState('Proof request was rejected by the user')
      setLoading(false)
    }
  }, [
    serverConnection?.state,
    serverProofRequest?.state,
    credentialData,
    updateData,
    setLoading,
    setErrorState,
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
          updateData({
            step: 'proof-request',
            invitationUrl: credentialData.invitationUrl,
            connectionId: credentialData.connectionId,
            presExId: credentialData.presExId,
          })

          const credentialDefinitionId = AGE_CRED_DEF_ID

          const proofResponse = await requestAgeProof.mutateAsync({
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
        } catch (error) {
          logger.error('Failed to send proof request', {error})
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
    _,
    setErrorState,
    updateData,
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
