import { Platform, ScrollView, ScrollViewProps, StyleSheet } from "react-native"
import { KeyboardAvoidingView } from "react-native"

interface KeyboardSafeScrollProps extends ScrollViewProps {
  children: React.ReactNode
}

/**
 * Scrollable container that avoids the keyboard on both iOS and Android.
 * Replaces the common pattern of wrapping ScrollView inside KeyboardAvoidingView.
 */
export function KeyboardSafeScroll({
  children,
  contentContainerStyle,
  ...rest
}: KeyboardSafeScrollProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentContainerStyle as object,
        ]}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
})
