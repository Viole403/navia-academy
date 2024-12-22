import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { colors } from "@/theme/colors";

export default function Index() {
  const { user, hydrated } = useAuthStore();
  const { hasOnboarded } = useAppStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!hasOnboarded) return <Redirect href="/(onboarding)" />;
  if (!user) return <Redirect href="/(auth)" />;
  return <Redirect href="/(tabs)" />;
}
