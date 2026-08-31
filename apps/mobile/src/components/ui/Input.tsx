import { TextInput, TextInputProps, View, Text } from "react-native"
import { useState } from "react"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  /** Extra hint below the input (e.g. constraints) */
  hint?: string
}

/**
 * Editorial input — bottom-rule only, no surrounding box.
 * Focus state darkens the rule, error turns it red.
 */
export function Input({ label, error, hint, ...rest }: InputProps) {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  const ruleColor = error ? theme.red : focused ? theme.text : theme.border

  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Text style={[type.labelSm, { color: theme.textMuted }]}>{label}</Text>
      )}
      <TextInput
        placeholderTextColor={theme.textDim}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: fonts.sans,
          fontSize: 17,
          lineHeight: 24,
          color: theme.text,
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: 1.5,
          borderBottomColor: ruleColor,
        }}
        {...rest}
      />
      {error ? (
        <Text
          style={{
            color: theme.red,
            fontSize: 12,
            fontFamily: fonts.sans,
            letterSpacing: 0.2,
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: theme.textDim,
            fontSize: 12,
            fontFamily: fonts.sans,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  )
}
