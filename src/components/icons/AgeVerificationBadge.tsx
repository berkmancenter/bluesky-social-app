import React from 'react'
import Svg, {Path, Rect} from 'react-native-svg'

import {type Props, useCommonSVGProps} from '#/components/icons/common'

export const AgeVerificationBadge = React.forwardRef<Svg, Props>(
  function AgeVerificationBadgeImpl(props, ref) {
    const {size, style, ...rest} = useCommonSVGProps(props)

    return (
      <Svg
        {...rest}
        ref={ref}
        viewBox="0 0 28 28"
        width={size}
        height={size}
        style={[style]}>
        {/* Badge background */}
        <Rect x="0" y="0" width="28" height="28" rx="6" fill="#1f9545" />

        {/* Shield icon (white fill) */}
        <Path
          fill="white"
          d="M14 6
             C 16.5 7.5, 19.5 7.5, 21 8.5
             V13.5
             C 21 17.5, 18 20, 14 21.5
             C 10 20, 7 17.5, 7 13.5
             V8.5
             C 8.5 7.5, 11.5 7.5, 14 6
             Z"
        />

        {/* Checkmark inside shield */}
        <Path
          fill="none"
          stroke="#1f9545"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.7 13.5 L13.7 15.5 L17.2 12"
        />
      </Svg>
    )
  },
)
