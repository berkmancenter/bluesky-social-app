import {Linking, View} from 'react-native'
// @ts-expect-error missing types
import QRCode from 'react-native-qrcode-styled'

import {isWeb} from '#/platform/detection'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowTopRight_Stroke2_Corner0_Rounded as ExternalIcon} from '#/components/icons/Arrow'
import {Text} from '#/components/Typography'

export function CredentialVerifierQrCode({
  invitationUrl,
}: {
  invitationUrl: string
}) {
  const handleOpenWallet = () => {
    Linking.openURL(invitationUrl)
  }

  return (
    <View style={{alignItems: 'center', justifyContent: 'center'}}>
      {isWeb ? (
        <QRCode
          data={invitationUrl}
          style={{width: 280, height: 280, backgroundColor: '#fff'}}
          pieceSize={isWeb ? 8 : 6}
          padding={20}
          pieceBorderRadius={isWeb ? 4.5 : 3.5}
          outerEyesOptions={{
            topLeft: {
              borderRadius: [12, 12, 0, 12],
              color: '#000',
            },
            topRight: {
              borderRadius: [12, 12, 12, 0],
              color: '#000',
            },
            bottomLeft: {
              borderRadius: [12, 0, 12, 12],
              color: '#000',
            },
          }}
          innerEyesOptions={{borderRadius: 3}}
        />
      ) : (
        <Button
          label="Open Wallet"
          size="large"
          variant="solid"
          color="primary"
          onPress={handleOpenWallet}
          style={{alignSelf: 'center', width: 240, marginTop: 16}}>
          <ButtonText>
            <Text>Open Wallet App</Text>
          </ButtonText>
          <ButtonIcon icon={ExternalIcon} />
        </Button>
      )}
    </View>
  )
}
