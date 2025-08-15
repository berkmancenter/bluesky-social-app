import {Linking, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {VerificationProcessor} from '#/lib/api/credentials/verification-processor'
import {getUserDisplayName} from '#/lib/getUserDisplayName'
import {type useProfileVerificationStatus} from '#/state/queries/credentials/useProfileVerificationStatus'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'
import type * as bsky from '#/types/bsky'

export {useDialogControl} from '#/components/Dialog'

export function AccountVerificationDialog({
  control,
  profile,
  verificationStatus,
}: {
  control: Dialog.DialogControlProps
  profile: bsky.profile.AnyProfileView
  verificationStatus: ReturnType<typeof useProfileVerificationStatus>
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Inner
        control={control}
        profile={profile}
        verificationStatus={verificationStatus}
      />
    </Dialog.Outer>
  )
}

function Inner({
  profile,
  control,
  verificationStatus,
}: {
  control: Dialog.DialogControlProps
  profile: bsky.profile.AnyProfileView
  verificationStatus: ReturnType<typeof useProfileVerificationStatus>
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {gtMobile} = useBreakpoints()

  const userName = getUserDisplayName(profile)
  const isViewer = verificationStatus.records.some(
    record => record.subject === profile.did,
  )
  const accountStatus = verificationStatus.status.account

  const label = isViewer
    ? _(msg`Your account verification`)
    : _(msg`${userName}'s account verification`)

  return (
    <Dialog.ScrollableInner
      label={label}
      style={[
        gtMobile ? {width: 'auto', maxWidth: 400, minWidth: 200} : a.w_full,
      ]}>
      <View style={[a.gap_sm, a.pb_lg]}>
        <Text style={[a.text_2xl, a.font_bold, a.pr_4xl, a.leading_tight]}>
          {label}
        </Text>
        <Text style={[a.text_md, a.leading_snug]}>
          {accountStatus.verified ? (
            <Trans>
              This account has an account verification badge because the account
              holder's identity has been verified through a trusted verification
              process.
            </Trans>
          ) : (
            <Trans>This account does not have account verification.</Trans>
          )}
        </Text>
      </View>

      {accountStatus.verified && accountStatus.record && (
        <View style={[a.pb_xl, a.gap_md]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Verification details:</Trans>
          </Text>

          <View style={[a.gap_lg]}>
            <View style={[a.gap_xs]}>
              <Text style={[a.text_sm, a.font_bold]}>
                <Trans>Verified at:</Trans>
              </Text>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                {accountStatus.verifiedAt?.toLocaleDateString()}
              </Text>
            </View>

            {accountStatus.expirationDate && (
              <View style={[a.gap_xs]}>
                <Text style={[a.text_sm, a.font_bold]}>
                  <Trans>Expires:</Trans>
                </Text>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {accountStatus.expirationDate.toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={[a.gap_xs]}>
              <Text style={[a.text_sm, a.font_bold]}>
                <Trans>Handle:</Trans>
              </Text>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                @
                {VerificationProcessor.extractScreenNameFromAccountRecord(
                  accountStatus.record,
                ) || accountStatus.record.handle}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View
        style={[
          a.w_full,
          a.gap_sm,
          a.justify_end,
          gtMobile
            ? [a.flex_row, a.flex_row_reverse, a.justify_start]
            : [a.flex_col],
        ]}>
        {accountStatus.verified && accountStatus.record && (
          <Button
            label={_(msg`View verification details on verifier service`)}
            size="small"
            variant="outline"
            color="primary"
            onPress={() => {
              const verifierUrl = accountStatus.record.credential.uri
              if (verifierUrl) {
                Linking.openURL(verifierUrl)
              }
            }}>
            <ButtonText>
              <Trans>View Details</Trans>
            </ButtonText>
          </Button>
        )}
        <Button
          label={_(msg`Close dialog`)}
          size="small"
          variant="solid"
          color="primary"
          onPress={() => {
            control.close()
          }}>
          <ButtonText>
            <Trans>Close</Trans>
          </ButtonText>
        </Button>
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}
