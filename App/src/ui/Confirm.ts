/** Cross-platform confirmation prompt. */
import { Alert, Platform } from "react-native";

export function confirmAction(message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void): void {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
