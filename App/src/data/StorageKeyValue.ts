/** Synchronous key-value store for settings: expo-sqlite kv-store on devices, localStorage on web (where sync SQLite cannot start at load time). */
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import type { KeyValueStore } from "./StoreSettings";

const webStore: KeyValueStore = {
  getItemSync: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItemSync: (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItemSync: (key) => globalThis.localStorage?.removeItem(key),
};

export const keyValueStore: KeyValueStore = Platform.OS === "web" ? webStore : Storage;
