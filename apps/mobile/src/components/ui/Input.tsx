import { Pressable, TextInput, TextInputProps, View, Text } from "react-native"
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
  // Password visibility: only when the caller asked for a secure field.
  const isPassword = rest.secureTextEntry === true
  const [hidden, setHidden] = useState(true)

  const ruleColor = error ? theme.red : focused ? theme.text : theme.border

  return (
    <View style={{ gap: 8 }}>
      {label && (
        <Text style={[type.labelSm, { color: theme.textMuted }]}>{label}</Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1.5,
          borderBottomColor: ruleColor,
        }}
      >
        <TextInput
          placeholderTextColor={theme.textDim}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            fontFamily: fonts.sans,
            fontSize: 17,
            lineHeight: 24,
            color: theme.text,
            paddingVertical: 12,
            paddingHorizontal: 0,
          }}
          {...rest}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            style={{ paddingLeft: 12, paddingVertical: 12 }}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                fontWeight: "600",
                color: theme.accent,
              }}
            >
              {hidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        )}
      </View>
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
