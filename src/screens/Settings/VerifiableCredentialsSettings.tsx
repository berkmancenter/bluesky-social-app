import {useState} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {logger} from '#/logger'
import * as Toast from '#/view/com/util/Toast'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'VerifiableCredentialsSettings'
>

export function VerifiableCredentialsSettingsScreen({}: Props) {
  const {_} = useLingui()
  const t = useTheme()

  // Mock state - replace with actual credential status from your API
  const [credentialStatus] = useState({
    age: {verified: false, verifiedAt: null},
    account: {verified: false, verifiedAt: null},
  })

  const handleVerifyCredential = async (_type: 'age' | 'account') => {
    try {
      logger.info('VerifiableCredentialsSettings: Starting verification')
      Toast.show(_(msg`Verification feature coming soon!`))

      // TODO: Call your verification service API here
      // const response = await fetch('YOUR_VERIFICATION_SERVICE_URL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     credentialType: type,
      //     userId: currentUser.id,
      //     callbackUrl: 'bluesky://credential-verification/callback'
      //   })
      // })
      // const {qrCodeUrl} = await response.json()
    } catch (error) {
      logger.error(
        'VerifiableCredentialsSettings: Failed to start verification',
        {error},
      )
      Toast.show(_(msg`Failed to start verification. Please try again.`))
    }
  }

  const getCredentialStatusText = (type: 'age' | 'account') => {
    const status = credentialStatus[type]
    if (status.verified) {
      return _(msg`Verified`)
    }
    return _(msg`Not verified`)
  }

  const getCredentialStatusColor = (type: 'age' | 'account') => {
    const status = credentialStatus[type]
    return status.verified
      ? t.palette.positive_500
      : t.atoms.text_contrast_medium.color
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Verifiable Credentials</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Item>
            <SettingsList.ItemIcon icon={ShieldIcon} />
            <SettingsList.ItemText>
              <Trans>Age Verification</Trans>
            </SettingsList.ItemText>
            <View style={[a.flex_row, a.align_center, a.gap_xs]}>
              <Text
                style={[{color: getCredentialStatusColor('age')}, a.text_sm]}>
                {getCredentialStatusText('age')}
              </Text>
              {credentialStatus.age.verified && (
                <CheckIcon size="sm" style={{color: t.palette.positive_500}} />
              )}
            </View>
          </SettingsList.Item>

          <SettingsList.PressableItem
            onPress={() => handleVerifyCredential('age')}
            label={_(msg`Verify your age`)}
            disabled={credentialStatus.age.verified}>
            <SettingsList.ItemIcon icon={ShieldIcon} />
            <SettingsList.ItemText>
              <Trans>Verify Age</Trans>
            </SettingsList.ItemText>
            <SettingsList.Chevron />
          </SettingsList.PressableItem>

          <SettingsList.Divider />

          <SettingsList.Item>
            <SettingsList.ItemIcon icon={ShieldIcon} />
            <SettingsList.ItemText>
              <Trans>Account Verification</Trans>
            </SettingsList.ItemText>
            <View style={[a.flex_row, a.align_center, a.gap_xs]}>
              <Text
                style={[
                  {color: getCredentialStatusColor('account')},
                  a.text_sm,
                ]}>
                {getCredentialStatusText('account')}
              </Text>
              {credentialStatus.account.verified && (
                <CheckIcon size="sm" style={{color: t.palette.positive_500}} />
              )}
            </View>
          </SettingsList.Item>

          <SettingsList.PressableItem
            onPress={() => handleVerifyCredential('account')}
            label={_(msg`Verify your social media accounts`)}
            disabled={credentialStatus.account.verified}>
            <SettingsList.ItemIcon icon={ShieldIcon} />
            <SettingsList.ItemText>
              <Trans>Verify Accounts</Trans>
            </SettingsList.ItemText>
            <SettingsList.Chevron />
          </SettingsList.PressableItem>

          <SettingsList.Divider />

          <SettingsList.Item>
            <SettingsList.ItemText
              style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Text>
                <Trans>
                  Verifiable credentials allow you to prove your age or account
                  ownership without revealing unnecessary personal information.
                  Your data stays private and secure in your wallet.
                </Trans>
              </Text>
            </SettingsList.ItemText>
          </SettingsList.Item>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
