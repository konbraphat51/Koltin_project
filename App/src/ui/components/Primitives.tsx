/** Small shared UI building blocks: screen container, buttons, text fields, cards. */
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from "react-native";
import { spacing, usePalette } from "../Theme";

export function ScreenScroll({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }, style]}>{children}</View>;
}

export function TextHeading({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <Text style={[styles.heading, { color: palette.text }]}>{children}</Text>;
}

export function TextBody({ children, muted, small }: { children: ReactNode; muted?: boolean; small?: boolean }) {
  const palette = usePalette();
  return <Text style={{ color: muted ? palette.textMuted : palette.text, fontSize: small ? 13 : 15 }}>{children}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = "primary", disabled, testID }: ButtonProps) {
  const palette = usePalette();
  const background = variant === "primary" ? palette.primary : "transparent";
  const color = variant === "primary" ? palette.onPrimary : variant === "danger" ? palette.danger : palette.primary;
  const border = variant === "primary" ? palette.primary : variant === "danger" ? palette.danger : palette.border;
  return (
    <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}>
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  secure?: boolean;
  testID?: string;
}

export function Field({ label, value, onChangeText, keyboardType, placeholder, secure, testID }: FieldProps) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <Text style={{ color: palette.textMuted, fontSize: 13 }}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]}
      />
    </View>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const palette = usePalette();
  return (
    <View style={[styles.segmented, { borderColor: palette.border }]}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: isActive }} onPress={() => onChange(option.value)} style={[styles.segment, { backgroundColor: isActive ? palette.primary : "transparent" }]}>
            <Text style={{ color: isActive ? palette.onPrimary : palette.text, fontSize: 14 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  heading: { fontSize: 17, fontWeight: "600" },
  button: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: spacing.lg, alignItems: "center" },
  buttonLabel: { fontSize: 15, fontWeight: "600" },
  field: { gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
  segmented: { flexDirection: "row", borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
