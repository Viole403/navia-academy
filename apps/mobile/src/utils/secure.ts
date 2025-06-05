import * as SecureStore from "expo-secure-store";

const KEY = "navia.tokens.v1";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // noop
  }
}
