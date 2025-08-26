/**
 * TODO: When adding new verification types, update the following:
 *
 * 1. src/lib/api/credentials/verification-types.ts
 *    - Add new type to VerificationType union (e.g., 'instagram' | 'reddit')
 *    - Add corresponding field to VerificationStatusMap interface
 *
 * 2. src/screens/Settings/VerifiableCredentialsSettings.tsx
 *    - Update isRealVerificationType() function to include new types
 *    - Change card status from 'coming_soon' to 'not_verified'
 *    - Add new badge icon import
 *
 * 3. src/components/verification/VerificationBadges.tsx
 *    - Add new verification badge component
 *    - Update badge rendering logic
 *
 * 4. Verification system backend
 *    - Implement actual verification flow for new platform
 *    - Add credential definition IDs
 *    - Update proof request templates
 */
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type VerificationType} from '#/lib/api/credentials/verification-types'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {logger} from '#/logger'
import {useVerificationStatus} from '#/state/queries/credentials/useVerificationStatus'
import * as Toast from '#/view/com/util/Toast'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {
  useVerifiableCredentialsDialogControl,
  VerifiableCredentialsDialogScreenID,
} from '#/components/dialogs/VerifiableCredentialsDialog'
import {AccountVerificationBadge} from '#/components/icons/AccountVerificationBadge'
import {AgeVerificationBadge} from '#/components/icons/AgeVerificationBadge'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'VerifiableCredentialsSettings'
>

// Define verification cards for clean card-based layout
interface VerificationCard {
  id: VerificationType | string
  title: string
  description: string
  icon: React.ComponentType<any>
  status: 'verified' | 'not_verified' | 'coming_soon'
  platform?: string
  actionLabel?: string
}

const VERIFICATION_CARDS: VerificationCard[] = [
  {
    id: 'age',
    title: 'Age Verification',
    description: "Verify your age using mobile driver's license",
    icon: AgeVerificationBadge,
    status: 'not_verified', // Will be updated dynamically
    actionLabel: 'Verify Age',
  },
  {
    id: 'account',
    title: 'X.com Account Verification',
    description: 'Verify your X.com account ownership',
    icon: AccountVerificationBadge,
    status: 'not_verified',
    platform: 'X.com',
    actionLabel: 'Verify X.com Account',
  },
  // Future verification cards - Coming Soon
  {
    id: 'instagram',
    title: 'Instagram Account Verification',
    description: 'Verify your Instagram account ownership',
    icon: ShieldIcon,
    status: 'coming_soon',
    platform: 'Instagram',
  },
  {
    id: 'reddit',
    title: 'Reddit Account Verification',
    description: 'Verify your Reddit account ownership',
    icon: ShieldIcon,
    status: 'coming_soon',
    platform: 'Reddit',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Profile Verification',
    description: 'Verify your LinkedIn professional profile',
    icon: ShieldIcon,
    status: 'coming_soon',
    platform: 'LinkedIn',
  },
]

export function VerifiableCredentialsSettingsScreen({}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const verifiableCredentialsDialogControl =
    useVerifiableCredentialsDialogControl()

  // Persistent state from PDS
  const {status: credentialStatus, isLoading, actions} = useVerificationStatus()

  // Ensure we work with implemented verification types (e.g. age, account)
  const isRealVerificationType = (id: string): id is VerificationType => {
    return id === 'age' || id === 'account'
  }

  const handleVerifyCredential = async (type: VerificationType) => {
    try {
      logger.info('VerifiableCredentialsSettings: Starting verification', {
        credentialType: type,
      })
      verifiableCredentialsDialogControl.open({
        id: VerifiableCredentialsDialogScreenID.Verify,
        credentialType: type,
        onVerify: () => {
          handleVerificationComplete(type)
        },
      })
    } catch (err) {
      logger.error(
        'VerifiableCredentialsSettings: Failed to start verification',
        {error: err},
      )
      Toast.show(_(msg`Failed to start verification. Please try again.`))
    }
  }

  const handleVerificationComplete = (type: VerificationType) => {
    // Refresh data from PDS
    actions.refreshFromPDS()

    Toast.show(_(msg`Verification completed successfully!`))
    logger.info('VerifiableCredentialsSettings: Verification completed', {
      credentialType: type,
    })
  }

  const getCredentialStatusText = (type: string) => {
    if (isLoading) {
      return _(msg`Loading...`)
    }

    if (!isRealVerificationType(type)) {
      return _(msg`Not verified`)
    }

    const status = credentialStatus[type]
    if (status.verified) {
      return _(msg`Verified`)
    }
    return _(msg`Not verified`)
  }

  const getCredentialStatusColor = (type: string) => {
    if (!isRealVerificationType(type)) {
      return t.atoms.text_contrast_medium.color
    }

    const status = credentialStatus[type]
    return status.verified
      ? t.palette.positive_700
      : t.atoms.text_contrast_medium.color
  }

  const getCardStatus = (
    card: VerificationCard,
  ): VerificationCard['status'] => {
    if (card.status === 'coming_soon') return 'coming_soon'

    if (!isRealVerificationType(card.id)) {
      console.warn(`Unknown verification type: ${card.id}`)
      return 'not_verified'
    }

    const status = credentialStatus[card.id]
    return status?.verified ? 'verified' : 'not_verified'
  }

  const renderVerificationCard = (card: VerificationCard) => {
    const status = getCardStatus(card)
    const isVerified = status === 'verified'
    const isComingSoon = status === 'coming_soon'
    const IconComponent = card.icon

    return (
      <View
        key={card.id}
        style={[
          a.border,
          a.rounded_md,
          a.p_md,
          a.mb_md,
          t.atoms.border_contrast_low,
          isComingSoon ? t.atoms.bg_contrast_25 : t.atoms.bg,
          {opacity: isComingSoon ? 0.6 : 1},
        ]}>
        {/* Card Header */}
        <View style={[a.flex_row, a.align_center, a.justify_between, a.mb_sm]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <View
              style={[
                a.align_center,
                a.justify_center,
                {width: 32, height: 32},
              ]}>
              <IconComponent size="lg" fill={t.atoms.text.color} />
            </View>
            <View>
              <Text style={[a.font_bold, a.text_md]}>{card.title}</Text>
            </View>
          </View>

          <View style={[a.flex_row, a.align_center, a.gap_xs]}>
            {!isComingSoon && (
              <Text
                style={[{color: getCredentialStatusColor(card.id)}, a.text_sm]}>
                {getCredentialStatusText(card.id)}
              </Text>
            )}
            {isVerified && (
              <VerifiedCheck size="sm" fill={t.palette.positive_700} />
            )}
            {isComingSoon && (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                Coming Soon
              </Text>
            )}
          </View>
        </View>

        {/* Card Description */}
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_sm]}>
          {card.description}
        </Text>

        {/* Card Action */}
        {!isComingSoon && (
          <SettingsList.PressableItem
            onPress={() => handleVerifyCredential(card.id as VerificationType)}
            label={_(msg`Verify your ${card.title.toLowerCase()}`)}
            disabled={isVerified}
            style={[a.mt_xs]}>
            <SettingsList.ItemText>
              <Text>{card.actionLabel || `Verify ${card.title}`}</Text>
            </SettingsList.ItemText>
            <SettingsList.Chevron />
          </SettingsList.PressableItem>
        )}
      </View>
    )
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
        <View style={[a.px_md, a.py_lg]}>
          {/* Available Verifications */}
          <Text style={[a.font_bold, a.text_lg, a.mb_md]}>
            <Trans>Available Verifications</Trans>
          </Text>

          {VERIFICATION_CARDS.filter(
            card => getCardStatus(card) !== 'coming_soon',
          ).map(renderVerificationCard)}

          {/* Coming Soon Section */}
          <View style={[a.mt_xl, a.mb_lg]}>
            <Text
              style={[
                a.font_bold,
                a.text_lg,
                a.mb_md,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>Coming Soon</Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_md]}>
              <Trans>
                We're working on adding more verification options to help you
                build trust and credibility.
              </Trans>
            </Text>
          </View>

          {VERIFICATION_CARDS.filter(
            card => getCardStatus(card) === 'coming_soon',
          ).map(renderVerificationCard)}

          {/* Info Section */}
          <View style={[a.mt_xl, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
            <Text
              style={[
                a.text_sm,
                t.atoms.text_contrast_medium,
                {textAlign: 'center'},
              ]}>
              <Trans>
                Verifiable credentials allow you to prove your age or account
                ownership without revealing unnecessary personal information.
                Your data stays private and secure in your wallet.
              </Trans>
            </Text>
          </View>
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
