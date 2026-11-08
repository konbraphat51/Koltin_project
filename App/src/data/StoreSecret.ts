/** The user's OpenAI API key, kept in the platform secure store (Android Keystore). Never logged or sent to our server. */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const keyName = "openAiApiKey";

export async function readOpenAiKey(): Promise<string | null> {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(keyName) ?? null;
  return SecureStore.getItemAsync(keyName);
}

export async function saveOpenAiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed === "") return removeOpenAiKey();
  if (Platform.OS === "web") globalThis.localStorage?.setItem(keyName, trimmed);
  else await SecureStore.setItemAsync(keyName, trimmed);
}

export async function removeOpenAiKey(): Promise<void> {
  if (Platform.OS === "web") globalThis.localStorage?.removeItem(keyName);
  else await SecureStore.deleteItemAsync(keyName);
}
