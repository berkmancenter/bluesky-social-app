import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {atoms as a, useTheme} from '#/alf'
import {
  type ScreenID,
  type ScreenProps,
} from '#/components/dialogs/VerifiableCredentialsDialog/types'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Span, Text} from '#/components/Typography'

export function Success({config}: ScreenProps<ScreenID.Success>) {
  const t = useTheme()

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

        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            You have successfully verified your{' '}
            {config.credentialType === 'age' ? 'age' : 'account'}. Your
            credential is now active and will be displayed on your profile.
          </Trans>
        </Text>
      </View>
    </View>
  )
}
