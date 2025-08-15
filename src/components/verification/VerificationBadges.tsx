import {View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {logger} from '#/logger'
import {type Shadow} from '#/state/cache/types'
import {useProfileVerificationStatus} from '#/state/queries/credentials/useProfileVerificationStatus'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import {AccountVerificationBadge} from '#/components/icons/AccountVerificationBadge'
import {AgeVerificationBadge} from '#/components/icons/AgeVerificationBadge'
import {
  type FullVerificationState,
  useFullVerificationState,
} from '#/components/verification'
import {AccountVerificationDialog} from '#/components/verification/AccountVerificationDialog'
import {AgeVerificationDialog} from '#/components/verification/AgeVerificationDialog'
import {VerificationCheck} from '#/components/verification/VerificationCheck'
import {shouldShowVerificationCheckButton} from '#/components/verification/VerificationCheckButton'
import {VerificationsDialog} from '#/components/verification/VerificationsDialog'
import {VerifierDialog} from '#/components/verification/VerifierDialog'
import type * as bsky from '#/types/bsky'

interface VerificationBadgesProps {
  profile: Shadow<bsky.profile.AnyProfileView>
  size: 'lg' | 'md' | 'sm'
}

export function VerificationBadges({profile, size}: VerificationBadgesProps) {
  const blueSkyVerificationState = useFullVerificationState({profile})
  const profileVerificationStatus = useProfileVerificationStatus(profile.did)

  const showBlueSkyBadge = shouldShowVerificationCheckButton(
    blueSkyVerificationState,
  )
  const showAgeBadge = profileVerificationStatus.isAgeVerified
  const showAccountBadge = profileVerificationStatus.isAccountVerified

  // If no badges to show, return null
  if (!showBlueSkyBadge && !showAgeBadge && !showAccountBadge) {
    return null
  }

  return (
    <View style={[a.flex_row, a.gap_xs, a.align_center, a.justify_start]}>
      {showBlueSkyBadge && (
        <BlueSkyVerificationBadge
          profile={profile}
          verificationState={blueSkyVerificationState}
          size={size}
        />
      )}
      {showAgeBadge && (
        <AgeVerificationBadgeButton
          profile={profile}
          verificationStatus={profileVerificationStatus}
          size={size}
        />
      )}
      {showAccountBadge && (
        <AccountVerificationBadgeButton
          profile={profile}
          verificationStatus={profileVerificationStatus}
          size={size}
        />
      )}
    </View>
  )
}

function BlueSkyVerificationBadge({
  profile,
  verificationState: state,
  size,
}: {
  profile: Shadow<bsky.profile.AnyProfileView>
  verificationState: FullVerificationState
  size: 'lg' | 'md' | 'sm'
}) {
  const t = useTheme()
  const {_} = useLingui()
  const verificationsDialogControl = useDialogControl()
  const verifierDialogControl = useDialogControl()
  const {gtPhone} = useBreakpoints()

  let dimensions = 12
  if (size === 'lg') {
    dimensions = gtPhone ? 20 : 18
  } else if (size === 'md') {
    dimensions = 16
  }

  const verifiedByHidden = !state.profile.showBadge && state.profile.isViewer

  return (
    <>
      <Button
        label={
          state.profile.isViewer
            ? _(msg`View your Bluesky verification`)
            : _(msg`View this user's Bluesky verification`)
        }
        hitSlop={20}
        onPress={() => {
          logger.metric('verification:badge:click', {}, {statsig: true})
          if (state.profile.role === 'verifier') {
            verifierDialogControl.open()
          } else {
            verificationsDialogControl.open()
          }
        }}
        style={[]}>
        {({hovered}) => (
          <View
            style={[
              a.justify_end,
              a.align_end,
              a.transition_transform,
              {
                width: dimensions,
                height: dimensions,
                transform: [
                  {
                    scale: hovered ? 1.1 : 1,
                  },
                ],
              },
            ]}>
            <VerificationCheck
              width={dimensions}
              fill={
                verifiedByHidden
                  ? t.atoms.bg_contrast_100.backgroundColor
                  : state.profile.isVerified
                    ? t.palette.primary_500
                    : t.atoms.bg_contrast_100.backgroundColor
              }
              verifier={state.profile.role === 'verifier'}
            />
          </View>
        )}
      </Button>

      <VerificationsDialog
        control={verificationsDialogControl}
        profile={profile}
        verificationState={state}
      />

      <VerifierDialog
        control={verifierDialogControl}
        profile={profile}
        verificationState={state}
      />
    </>
  )
}

function AgeVerificationBadgeButton({
  profile,
  verificationStatus,
  size,
}: {
  profile: Shadow<bsky.profile.AnyProfileView>
  verificationStatus: ReturnType<typeof useProfileVerificationStatus>
  size: 'lg' | 'md' | 'sm'
}) {
  const {_} = useLingui()
  const ageVerificationDialogControl = useDialogControl()
  const {gtPhone} = useBreakpoints()

  let dimensions = 12
  if (size === 'lg') {
    dimensions = gtPhone ? 20 : 18
  } else if (size === 'md') {
    dimensions = 16
  }

  return (
    <>
      <Button
        label={_(msg`View age verification`)}
        hitSlop={20}
        onPress={() => {
          logger.metric('verification:badge:click', {}, {statsig: true})
          ageVerificationDialogControl.open()
        }}
        style={[]}>
        {({hovered}) => (
          <View
            style={[
              a.justify_center,
              a.align_center,
              a.transition_transform,
              {
                width: dimensions,
                height: dimensions,
                transform: [
                  {
                    scale: hovered ? 1.1 : 1,
                  },
                ],
              },
            ]}>
            <AgeVerificationBadge width={dimensions} height={dimensions} />
          </View>
        )}
      </Button>

      <AgeVerificationDialog
        control={ageVerificationDialogControl}
        profile={profile}
        verificationStatus={verificationStatus}
      />
    </>
  )
}

function AccountVerificationBadgeButton({
  profile,
  verificationStatus,
  size,
}: {
  profile: Shadow<bsky.profile.AnyProfileView>
  verificationStatus: ReturnType<typeof useProfileVerificationStatus>
  size: 'lg' | 'md' | 'sm'
}) {
  const t = useTheme()
  const {_} = useLingui()
  const accountVerificationDialogControl = useDialogControl()
  const {gtPhone} = useBreakpoints()

  let dimensions = 12
  if (size === 'lg') {
    dimensions = gtPhone ? 20 : 18
  } else if (size === 'md') {
    dimensions = 16
  }

  return (
    <>
      <Button
        label={_(msg`View account verification`)}
        hitSlop={20}
        onPress={() => {
          logger.metric('verification:badge:click', {}, {statsig: true})
          accountVerificationDialogControl.open()
        }}
        style={[]}>
        {({hovered}) => (
          <View
            style={[
              a.justify_end,
              a.align_end,
              a.transition_transform,
              {
                width: dimensions,
                height: dimensions,
                transform: [
                  {
                    scale: hovered ? 1.1 : 1,
                  },
                ],
              },
            ]}>
            <AccountVerificationBadge
              width={dimensions}
              height={dimensions}
              fill={t.palette.primary_500}
            />
          </View>
        )}
      </Button>

      <AccountVerificationDialog
        control={accountVerificationDialogControl}
        profile={profile}
        verificationStatus={verificationStatus}
      />
    </>
  )
}
