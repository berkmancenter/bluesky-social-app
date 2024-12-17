import React, {useCallback, useEffect,useRef, useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import axios from 'axios'
import * as EmailValidator from 'email-validator'
import QRCode from 'react-qr-code'
import type tldts from 'tldts'

import {logEvent} from '#/lib/statsig/statsig'
import {isEmailMaybeInvalid} from '#/lib/strings/email'
import {logger} from '#/logger'
import {ScreenTransition} from '#/screens/Login/ScreenTransition'
import {is13, is18, useSignupContext} from '#/screens/Signup/state'
import {Policies} from '#/screens/Signup/StepInfo/Policies'
import {atoms as a} from '#/alf'
import {Button, ButtonIcon,ButtonText} from '#/components/Button'
import {Divider} from '#/components/Divider'
import * as DateField from '#/components/forms/DateField'
import {FormError} from '#/components/forms/FormError'
import {HostingProvider} from '#/components/forms/HostingProvider'
import * as TextField from '#/components/forms/TextField'
import {Envelope_Stroke2_Corner0_Rounded as Envelope} from '#/components/icons/Envelope'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {Ticket_Stroke2_Corner0_Rounded as Ticket} from '#/components/icons/Ticket'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {BackNextButtons} from '../BackNextButtons'

const AGENT_URL = process.env.AGENT_URL || 'https://asml-acapy-bsky.ngrok.io'
const SCHEMA_ID =
  process.env.SCHEMA_ID ||
  'LJWQmqq9sE8safrFQqQnUv:2:phone verification:77.81.71'
const CRED_DEF_ID =
  process.env.CRED_DEF_ID ||
  'LJWQmqq9sE8safrFQqQnUv:3:CL:2616193:ASML.phone_verification'
const TINYURL_API = 'https://tinyurl.com/api-create.php?url='

function sanitizeDate(date: Date): Date {
  if (!date || date.toString() === 'Invalid Date') {
    logger.error(`Create account: handled invalid date for birthDate`, {
      hasDate: !!date,
    })
    return new Date()
  }
  return date
}

export function StepInfo({
  onPressBack,
  isServerError,
  refetchServer,
  isLoadingStarterPack,
}: {
  onPressBack: () => void
  isServerError: boolean
  refetchServer: () => void
  isLoadingStarterPack: boolean
}) {
  const {_} = useLingui()
  const {state, dispatch} = useSignupContext()

  const inviteCodeValueRef = useRef<string>(state.inviteCode)
  const emailValueRef = useRef<string>(state.email)
  const prevEmailValueRef = useRef<string>(state.email)
  const passwordValueRef = useRef<string>(state.password)

  const [hasWarnedEmail, setHasWarnedEmail] = React.useState<boolean>(false)
  const [qrUrl, setQrUrl] = React.useState<string>('')
  const [showQR, setShowQR] = React.useState(false)
  const [isGeneratingQR, setIsGeneratingQR] = React.useState(false)
  const [presExId, setPresExId] = useState<string>('')
  const [verificationState, setVerificationState] = useState<string>('')
  const [revealedAttributes, setRevealedAttributes] = useState<any>(null)

  const tldtsRef = React.useRef<typeof tldts>()
  React.useEffect(() => {
    // @ts-expect-error - valid path
    import('tldts/dist/index.cjs.min.js').then(tldts => {
      tldtsRef.current = tldts
    })
    // This will get used in the avatar creator a few steps later, so lets preload it now
    // @ts-expect-error - valid path
    import('react-native-view-shot/src/index')
  }, [])

  const createProofRequest = async () => {
    try {
      console.log(
        'Making proof request to:',
        `${AGENT_URL}/present-proof-2.0/create-request`,
      )
      const proofReq = await axios.post(
        `${AGENT_URL}/present-proof-2.0/create-request`,
        {
          presentation_request: {
            indy: {
              name: 'Proof of Credential Existence',
              version: '1.0',
              nonce: '1234567890',
              requested_attributes: {
                '0_any_uuid': {
                  name: 'area_code',
                  restrictions: [
                    {
                      schema_id: SCHEMA_ID,
                      cred_def_id: CRED_DEF_ID,
                    },
                  ],
                },
              },
              requested_predicates: {},
            },
          },
        },
      )
      console.log('Proof request response:', proofReq.data)
      return proofReq.data.pres_ex_id
    } catch (err) {
      console.error('Proof request error:', {
        message: err.message,
        config: err.config,
        response: err.response?.data,
      })
      logger.error('Failed to create proof request', err)
      throw err
    }
  }

  const createOOBInvitation = async (presExId: string) => {
    try {
      console.log('Creating OOB invitation for presExId:', presExId)
      console.log(
        'OOB invitation endpoint:',
        `${AGENT_URL}/out-of-band/create-invitation`,
      )
      const oobInvite = await axios.post(
        `${AGENT_URL}/out-of-band/create-invitation`,
        {
          handshake_protocols: ['https://didcomm.org/didexchange/1.0'],
          auto_accept: true,
          attachments: [
            {
              id: presExId,
              type: 'present-proof',
            },
          ],
        },
      )
      console.log('OOB invitation response:', oobInvite.data)
      return oobInvite.data.invitation_url
    } catch (err) {
      console.error('OOB invitation error:', {
        message: err.message,
        config: err.config,
        response: err.response?.data,
      })
      logger.error('Failed to create OOB invitation', err)
      throw err
    }
  }

  const onNextPress = () => {
    const inviteCode = inviteCodeValueRef.current
    const email = emailValueRef.current
    const emailChanged = prevEmailValueRef.current !== email
    const password = passwordValueRef.current

    if (emailChanged && tldtsRef.current) {
      if (isEmailMaybeInvalid(email, tldtsRef.current)) {
        prevEmailValueRef.current = email
        setHasWarnedEmail(true)
        return dispatch({
          type: 'setError',
          value: _(
            msg`It looks like you may have entered your email address incorrectly. Are you sure it's right?`,
          ),
        })
      }
    } else if (hasWarnedEmail) {
      setHasWarnedEmail(false)
    }
    prevEmailValueRef.current = email

    if (!is13(state.dateOfBirth)) {
      return
    }

    if (state.serviceDescription?.inviteCodeRequired && !inviteCode) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please enter your invite code.`),
      })
    }
    if (!email) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please enter your email.`),
      })
    }
    if (!EmailValidator.validate(email)) {
      return dispatch({
        type: 'setError',
        value: _(msg`Your email appears to be invalid.`),
      })
    }
    if (!password) {
      return dispatch({
        type: 'setError',
        value: _(msg`Please choose your password.`),
      })
    }

    dispatch({type: 'setInviteCode', value: inviteCode})
    dispatch({type: 'setEmail', value: email})
    dispatch({type: 'setPassword', value: password})
    dispatch({type: 'next'})
    logEvent('signup:nextPressed', {
      activeStep: state.activeStep,
    })
  }

  const checkVerificationStatus = useCallback(async () => {
    if (!presExId) return

    try {
      const response = await axios.get(
        `${AGENT_URL}/present-proof-2.0/records/${presExId}`,
      )
      const state = response.data.state
      setVerificationState(state)

      // If verification is done, extract revealed attributes
      if (state === 'done') {
        const revealed =
          response.data.by_format?.pres?.indy?.requested_proof?.revealed_attrs
        setRevealedAttributes(revealed)
      }
    } catch (err) {
      logger.error('Failed to check verification status', err)
    }
  }, [presExId])

  useEffect(() => {
    if (!presExId) return

    const interval = setInterval(checkVerificationStatus, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [presExId, checkVerificationStatus])

  const onPressASMLSignup = React.useCallback(async () => {
    try {
      // First, open the ASML issuer page in a new tab
      window.open('https://asml-issuer.vercel.app/', '_blank')

      // Then start generating QR code in the background
      setIsGeneratingQR(true)
      setShowQR(false)

      console.log('Creating proof request...')
      const presExId = await createProofRequest()
      console.log('Proof request ID:', presExId)
      setPresExId(presExId)

      console.log('Creating OOB invitation...')
      const inviteUrl = await createOOBInvitation(presExId)
      console.log('Original invite URL:', inviteUrl)

      const tinyUrlEndpoint = `${TINYURL_API}${encodeURIComponent(inviteUrl)}`
      console.log('TinyURL API endpoint:', tinyUrlEndpoint)

      const shortUrl = await axios.get(tinyUrlEndpoint)
      console.log('Shortened URL:', shortUrl.data)

      setQrUrl(shortUrl.data)
      setShowQR(true)
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        config: err.config,
        response: err.response?.data,
      })
      logger.error('Failed to generate QR code', err)
      dispatch({
        type: 'setError',
        value: _(
          msg`Failed to generate verification QR code. Please try again.`,
        ),
      })
      setShowQR(false)
    } finally {
      setIsGeneratingQR(false)
    }
  }, [_, dispatch])

  return (
    <ScreenTransition>
      <View style={[a.gap_md]}>
        <FormError error={state.error} />
        <View>
          <TextField.LabelText>
            <Trans>Hosting provider</Trans>
          </TextField.LabelText>
          <HostingProvider
            serviceUrl={state.serviceUrl}
            onSelectServiceUrl={v =>
              dispatch({type: 'setServiceUrl', value: v})
            }
          />
        </View>
        {state.isLoading || isLoadingStarterPack ? (
          <View style={[a.align_center]}>
            <Loader size="xl" />
          </View>
        ) : state.serviceDescription ? (
          <>
            {state.serviceDescription.inviteCodeRequired && (
              <View>
                <TextField.LabelText>
                  <Trans>Invite code</Trans>
                </TextField.LabelText>
                <TextField.Root>
                  <TextField.Icon icon={Ticket} />
                  <TextField.Input
                    onChangeText={value => {
                      inviteCodeValueRef.current = value.trim()
                    }}
                    label={_(msg`Required for this provider`)}
                    defaultValue={state.inviteCode}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                  />
                </TextField.Root>
              </View>
            )}
            <View>
              <TextField.LabelText>
                <Trans>Email</Trans>
              </TextField.LabelText>
              <TextField.Root>
                <TextField.Icon icon={Envelope} />
                <TextField.Input
                  testID="emailInput"
                  onChangeText={value => {
                    emailValueRef.current = value.trim()
                    if (hasWarnedEmail) {
                      setHasWarnedEmail(false)
                    }
                  }}
                  label={_(msg`Enter your email address`)}
                  defaultValue={state.email}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
              </TextField.Root>
            </View>
            <View>
              <TextField.LabelText>
                <Trans>Password</Trans>
              </TextField.LabelText>
              <TextField.Root>
                <TextField.Icon icon={Lock} />
                <TextField.Input
                  testID="passwordInput"
                  onChangeText={value => {
                    passwordValueRef.current = value
                  }}
                  label={_(msg`Choose your password`)}
                  defaultValue={state.password}
                  secureTextEntry
                  autoComplete="new-password"
                  autoCapitalize="none"
                />
              </TextField.Root>
            </View>
            <View>
              <DateField.LabelText>
                <Trans>Your birth date</Trans>
              </DateField.LabelText>
              <DateField.DateField
                testID="date"
                value={DateField.utils.toSimpleDateString(state.dateOfBirth)}
                onChangeDate={date => {
                  dispatch({
                    type: 'setDateOfBirth',
                    value: sanitizeDate(new Date(date)),
                  })
                }}
                label={_(msg`Date of birth`)}
                accessibilityHint={_(msg`Select your date of birth`)}
              />
            </View>
            <Policies
              serviceDescription={state.serviceDescription}
              needsGuardian={!is18(state.dateOfBirth)}
              under13={!is13(state.dateOfBirth)}
            />
          </>
        ) : undefined}
        <View style={[a.mt_3xl]}>
          <View style={[a.flex_row, a.align_center, a.gap_md]}>
            <Divider style={[a.flex_1]} />
            <Text style={[a.text_contrast_medium]}>
              <Trans>or</Trans>
            </Text>
            <Divider style={[a.flex_1]} />
          </View>

          <View style={[a.mt_xl]}>
            <Text style={[a.text_center, a.text_contrast_medium, a.mb_lg]}>
              <Trans>Get verified with ASML</Trans>
            </Text>
            {showQR ? (
              <View style={[a.align_center, a.gap_md]}>
                <QRCode value={qrUrl} size={200} />
                <View
                  style={[
                    a.bg_contrast_25,
                    a.p_lg,
                    a.rounded_lg,
                    a.w_full,
                    a.mt_md,
                  ]}>
                  <Text style={[a.text_sm, a.text_center, a.mb_sm]}>
                    <Trans>
                      Verification Status:{' '}
                      {verificationState || 'Waiting for scan...'}
                    </Trans>
                  </Text>

                  {verificationState === 'done' && revealedAttributes && (
                    <View style={[a.mt_md]}>
                      <Text style={[a.text_sm, a.font_bold, a.mb_xs]}>
                        <Trans>Verified Attributes:</Trans>
                      </Text>
                      {Object.entries(revealedAttributes).map(
                        ([key, value]: [string, any]) => (
                          <Text key={key} style={[a.text_sm]}>
                            {key}: {value.raw}
                          </Text>
                        ),
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <Button
                variant="solid"
                color="secondary"
                size="large"
                onPress={onPressASMLSignup}
                disabled={isGeneratingQR}
                style={[
                  a.flex_row,
                  a.justify_center,
                  a.align_center,
                  a.gap_md,
                  {backgroundColor: '#000000'},
                ]}>
                <ButtonText style={{color: '#FFFFFF'}}>
                  {isGeneratingQR ? (
                    <Trans>Generating verification...</Trans>
                  ) : (
                    <Trans>Continue with ASML</Trans>
                  )}
                </ButtonText>
                {isGeneratingQR && <ButtonIcon icon={Loader} />}
              </Button>
            )}
          </View>
        </View>
      </View>
      <BackNextButtons
        hideNext={!is13(state.dateOfBirth)}
        showRetry={isServerError}
        isLoading={state.isLoading}
        onBackPress={onPressBack}
        onNextPress={onNextPress}
        onRetryPress={refetchServer}
        overrideNextText={hasWarnedEmail ? _(msg`It's correct`) : undefined}
      />
    </ScreenTransition>
  )
}
