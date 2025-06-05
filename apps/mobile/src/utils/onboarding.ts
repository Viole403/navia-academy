import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "navia.onboarded.v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "1";
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY, "1");
}
