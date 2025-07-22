import {useCallback, useState} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {web} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {type StatefulControl} from '#/components/dialogs/Context'
import {useGlobalDialogsControlContext} from '#/components/dialogs/Context'
import {Success} from '#/components/dialogs/VerifiableCredentialsDialog/screens/Success'
import {Verify} from '#/components/dialogs/VerifiableCredentialsDialog/screens/Verify'
import {
  type Screen,
  ScreenID,
} from '#/components/dialogs/VerifiableCredentialsDialog/types'

export type {Screen} from '#/components/dialogs/VerifiableCredentialsDialog/types'
export {ScreenID as VerifiableCredentialsDialogScreenID} from '#/components/dialogs/VerifiableCredentialsDialog/types'

export function useVerifiableCredentialsDialogControl() {
  return useGlobalDialogsControlContext().verifiableCredentialsDialogControl
}

export function VerifiableCredentialsDialog() {
  const {_} = useLingui()
  const verifiableCredentialsDialogControl =
    useVerifiableCredentialsDialogControl()
  const onClose = useCallback(() => {
    if (verifiableCredentialsDialogControl.value?.id === ScreenID.Verify) {
      verifiableCredentialsDialogControl.value.onCloseWithoutVerifying?.()
    }
    verifiableCredentialsDialogControl.clear()
  }, [verifiableCredentialsDialogControl])

  return (
    <Dialog.Outer
      control={verifiableCredentialsDialogControl.control}
      onClose={onClose}>
      <Dialog.Handle />

      <Dialog.ScrollableInner
        label={_(msg`Verify your credentials using a wallet`)}
        style={web({maxWidth: 400})}>
        <Inner control={verifiableCredentialsDialogControl} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({control}: {control: StatefulControl<Screen>}) {
  const [screen, showScreen] = useState(() => control.value)

  if (!screen) return null

  switch (screen.id) {
    case ScreenID.Verify: {
      return <Verify config={screen} showScreen={showScreen} />
    }
    case ScreenID.Success: {
      return <Success config={screen} showScreen={showScreen} />
    }
    default: {
      return null
    }
  }
}
