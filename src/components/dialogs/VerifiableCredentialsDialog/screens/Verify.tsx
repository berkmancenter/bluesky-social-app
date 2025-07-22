import {useEffect, useReducer} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {wait} from '#/lib/async/wait'
import {useCleanError} from '#/lib/hooks/useCleanError'
import {logger} from '#/logger'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {
  ScreenID,
  type ScreenProps,
} from '#/components/dialogs/VerifiableCredentialsDialog/types'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Loader} from '#/components/Loader'
import {Span, Text} from '#/components/Typography'

type State = {
  step: 'qr' | 'scanning' | 'success'
  mutationStatus: 'pending' | 'success' | 'error' | 'default'
  error: string
  qrCodeData: string
}

type Action =
  | {type: 'setStep'; step: State['step']}
  | {type: 'setMutationStatus'; status: State['mutationStatus']}
  | {type: 'setError'; error: string}
  | {type: 'setQrCodeData'; data: string}
  | {type: 'clearError'}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setStep':
      return {...state, step: action.step}
    case 'setMutationStatus':
      return {...state, mutationStatus: action.status}
    case 'setError':
      return {...state, error: action.error}
    case 'setQrCodeData':
      return {...state, qrCodeData: action.data}
    case 'clearError':
      return {...state, error: ''}
    default:
      return state
  }
}

const initialState: State = {
  step: 'qr',
  mutationStatus: 'default',
  error: '',
  qrCodeData: '',
}

export function Verify({config, showScreen}: ScreenProps<ScreenID.Verify>) {
  const t = useTheme()
  const {_} = useLingui()
  const cleanError = useCleanError()
  const [state, dispatch] = useReducer(reducer, initialState)

  // Generate QR code data when component mounts
  useEffect(() => {
    const generateQrCode = async () => {
      try {
        // In a real implementation, this would call your verification service API
        // to get a unique QR code URL for this verification session
        const mockQrData = `https://acapy.asml.berkmancenter.org/credential/${config.credentialType}/${Date.now()}`
        dispatch({type: 'setQrCodeData', data: mockQrData})
      } catch (error) {
        logger.error(
          'VerifiableCredentialsDialog: Failed to generate QR code',
          {
            safeMessage: error,
          },
        )
        const {clean} = cleanError(error)
        dispatch({
          type: 'setError',
          error: clean || _(msg`Failed to generate QR code, please try again.`),
        })
      }
    }

    generateQrCode()
  }, [config.credentialType, cleanError, _])

  const handleStartVerification = async () => {
    dispatch({
      type: 'setMutationStatus',
      status: 'pending',
    })

    try {
      // In a real implementation, this would:
      // 1. Call your verification service to create a verification session
      // 2. Start polling for verification status

      logger.info('VerifiableCredentialsDialog: Starting verification', {
        credentialType: config.credentialType,
      })

      dispatch({
        type: 'setStep',
        step: 'scanning',
      })

      // Mock verification completion after 3 seconds
      await wait(3000, Promise.resolve())

      dispatch({
        type: 'setMutationStatus',
        status: 'success',
      })

      dispatch({
        type: 'setStep',
        step: 'success',
      })

      if (config.onVerify) {
        config.onVerify()
      } else {
        showScreen({
          id: ScreenID.Success,
          credentialType: config.credentialType,
        })
      }
    } catch (error) {
      logger.error('VerifiableCredentialsDialog: Verification failed', {
        safeMessage: error,
      })
      const {clean} = cleanError(error)
      dispatch({
        type: 'setError',
        error: clean || _(msg`Verification failed, please try again.`),
      })
      dispatch({
        type: 'setMutationStatus',
        status: 'error',
      })
    }
  }

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

  const getCredentialInstructions = () => {
    switch (config.credentialType) {
      case 'age':
        return _(
          msg`Scan this QR code with your wallet to verify your age. Your wallet will securely share only the necessary proof without revealing your actual birth date.`,
        )
      case 'account':
        return _(
          msg`Scan this QR code with your wallet to verify your social media accounts. Your wallet will securely share proof of account ownership without revealing your account details.`,
        )
      default:
        return _(
          msg`Scan this QR code with your wallet to complete verification. Your data stays private and secure.`,
        )
    }
  }

  if (state.step === 'success') {
    return (
      <View style={[a.gap_lg]}>
        <View style={[a.gap_sm]}>
          <Text style={[a.text_xl, a.font_heavy]}>
            <Span style={{top: 1}}>
              <ShieldIcon size="sm" fill={t.palette.positive_600} />
            </Span>
            {'  '}
            <Trans>Verification complete!</Trans>
          </Text>

          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              You have successfully verified your{' '}
              {config.credentialType === 'age' ? 'age' : 'account'}. You can
              close this dialog.
            </Trans>
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[a.gap_lg]}>
      <View style={[a.gap_sm]}>
        <Text style={[a.text_xl, a.font_heavy]}>
          {state.step === 'qr' ? (
            state.mutationStatus === 'success' ? (
              <>
                <Span style={{top: 1}}>
                  <ShieldIcon size="sm" fill={t.palette.positive_600} />
                </Span>
                {'  '}
                <Trans>QR Code Ready!</Trans>
              </>
            ) : (
              <Trans>{getCredentialTitle()}</Trans>
            )
          ) : (
            <Trans>Scanning QR Code</Trans>
          )}
        </Text>

        {state.step === 'qr' && state.mutationStatus !== 'success' && (
          <>
            {config.instructions?.map((int, i) => (
              <Text
                key={i}
                style={[
                  a.italic,
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                {int}
              </Text>
            ))}
          </>
        )}

        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          {state.step === 'qr' ? (
            state.mutationStatus === 'success' ? (
              <Trans>
                Your QR code is ready to scan. Open your wallet app and scan the
                code below.
              </Trans>
            ) : (
              getCredentialInstructions()
            )
          ) : (
            <Trans>
              Please scan the QR code with your wallet to complete the
              verification process.
            </Trans>
          )}
        </Text>

        {state.step === 'qr' && state.mutationStatus === 'success' && (
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              Don't have a wallet? You'll need to set one up first to use
              verifiable credentials.
            </Trans>
          </Text>
        )}
      </View>

      {state.step === 'qr' && state.mutationStatus !== 'success' ? (
        <>
          {state.error && <Admonition type="error">{state.error}</Admonition>}

          {/* QR Code Display */}
          {state.qrCodeData && (
            <View
              style={[
                a.p_lg,
                t.atoms.bg_contrast_25,
                a.rounded_lg,
                a.align_center,
                a.justify_center,
                {minHeight: 200, minWidth: 200},
              ]}>
              <View
                style={[
                  a.align_center,
                  a.justify_center,
                  {width: 180, height: 180},
                ]}>
                <Text
                  style={[
                    a.text_md,
                    t.atoms.text_contrast_medium,
                    a.text_center,
                  ]}>
                  <Trans>QR Code</Trans>
                </Text>
                <Text
                  style={[
                    a.text_sm,
                    t.atoms.text_contrast_medium,
                    a.text_center,
                    a.mt_sm,
                  ]}>
                  {state.qrCodeData.substring(0, 30)}...
                </Text>
              </View>
            </View>
          )}

          <Button
            label={_(msg`Start verification process`)}
            size="large"
            variant="solid"
            color="primary"
            onPress={handleStartVerification}
            disabled={state.mutationStatus === 'pending' || !state.qrCodeData}>
            <ButtonText>
              <Trans>Start Verification</Trans>
            </ButtonText>
            <ButtonIcon
              icon={state.mutationStatus === 'pending' ? Loader : ShieldIcon}
            />
          </Button>
        </>
      ) : null}

      {state.step === 'scanning' && (
        <View style={[a.align_center, a.justify_center, a.py_xl]}>
          <Loader size="xl" fill={t.atoms.text_contrast_low.color} />
          <Text style={[a.text_md, a.mt_md, t.atoms.text_contrast_medium]}>
            <Trans>Verifying your credential...</Trans>
          </Text>
        </View>
      )}
    </View>
  )
}
