import {useEffect, useReducer, useRef} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useCleanError} from '#/lib/hooks/useCleanError'
import {logger} from '#/logger'
import {
  usePersistentConnection,
  useStartCredentialFlowMutation,
} from '#/state/queries/credentials'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {CredentialVerifierQrCode} from '#/components/VerifiableCredentials/CredentialVerifierQrCode'

type State = {
  step: 'qr' | 'scanning' | 'success'
  mutationStatus: 'pending' | 'success' | 'error' | 'default'
  error: string
  invitationUrl: string
  connectionId: string
}

type Action =
  | {type: 'setStep'; step: State['step']}
  | {type: 'setMutationStatus'; status: State['mutationStatus']}
  | {type: 'setError'; error: string}
  | {type: 'setQrCodeData'; data: string}
  | {type: 'clearError'}
  | {type: 'setInvitationData'; invitationUrl: string; connectionId: string}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setStep':
      return {...state, step: action.step}
    case 'setMutationStatus':
      return {...state, mutationStatus: action.status}
    case 'setError':
      return {...state, error: action.error}
    case 'setQrCodeData':
      return {...state, invitationUrl: action.data, connectionId: ''}
    case 'clearError':
      return {...state, error: ''}
    case 'setInvitationData':
      return {
        ...state,
        invitationUrl: action.invitationUrl,
        connectionId: action.connectionId,
      }
    default:
      return state
  }
}

const initialState: State = {
  step: 'qr',
  mutationStatus: 'default',
  error: '',
  invitationUrl: '',
  connectionId: '',
}

export function Verify({config}: any) {
  const t = useTheme()
  const {_} = useLingui()
  const cleanError = useCleanError()
  const [state, dispatch] = useReducer(reducer, initialState)
  const hasCreatedInvitation = useRef(false)

  // Credential flow mutation
  const startCredentialFlow = useStartCredentialFlowMutation()

  // Generate connection invitation when component mounts
  useEffect(() => {
    const generateInvitation = async () => {
      try {
        if (hasCreatedInvitation.current) return
        hasCreatedInvitation.current = true

        const invitation = await startCredentialFlow.mutateAsync(
          config.credentialType,
        )
        dispatch({
          type: 'setInvitationData',
          invitationUrl: invitation.invitation_url,
          connectionId: invitation.connection_id,
        })
        dispatch({type: 'setMutationStatus', status: 'success'})
      } catch (error) {
        logger.error(
          'VerifiableCredentialsDialog: Failed to generate connection invitation',
          {safeMessage: error},
        )
        const {clean} = cleanError(error)
        dispatch({
          type: 'setError',
          error:
            clean ||
            _(msg`Failed to generate connection invitation, please try again.`),
        })
        dispatch({type: 'setMutationStatus', status: 'error'})
      }
    }
    generateInvitation()
  }, [cleanError, _, config.credentialType, startCredentialFlow])

  // Use persistent connection for polling status
  usePersistentConnection(state.connectionId)

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
        <Trans>
          Scan this QR code with your wallet to establish a secure connection.
        </Trans>
      </Text>
      {state.error && (
        <Admonition type="error" style={{marginBottom: 16}}>
          {state.error}
        </Admonition>
      )}
      {state.mutationStatus === 'pending' || !state.invitationUrl ? (
        <View style={{marginVertical: 40, alignItems: 'center'}}>
          <Loader />
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
          <CredentialVerifierQrCode invitationUrl={state.invitationUrl} />
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
