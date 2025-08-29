import {Text, type TextProps} from 'react-native'

export function ASMLLogo({style, ...rest}: TextProps) {
  return (
    <Text
      style={[
        {
          fontSize: 20,
          fontWeight: 'bold',
          letterSpacing: 1,
          lineHeight: 28,
          color: 'white',
        },
        style,
      ]}
      {...rest}>
      ASML
    </Text>
  )
}
