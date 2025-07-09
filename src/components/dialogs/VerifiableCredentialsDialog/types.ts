import {type ReactNode} from 'react'

export enum ScreenID {
  Verify = 'verify',
  Success = 'success',
}

export type Screen =
  | {
      id: ScreenID.Verify
      credentialType: 'age' | 'account'
      instructions?: ReactNode[]
      onVerify?: () => void
      onCloseWithoutVerifying?: () => void
    }
  | {
      id: ScreenID.Success
      credentialType: 'age' | 'account'
      onClose?: () => void
    }

export type ScreenProps<T extends ScreenID> = {
  config: Extract<Screen, {id: T}>
  showScreen: (screen: Screen) => void
}
