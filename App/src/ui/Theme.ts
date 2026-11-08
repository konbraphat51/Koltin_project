/** Colors and spacing; follows the system light/dark setting. */
import { useColorScheme } from "react-native";

export interface Palette {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  energy: string;
  protein: string;
  fat: string;
  carbohydrate: string;
}

const light: Palette = {
  background: "#F4F6F5",
  card: "#FFFFFF",
  text: "#1B2420",
  textMuted: "#66726C",
  border: "#DCE3DF",
  primary: "#1F8A5B",
  onPrimary: "#FFFFFF",
  danger: "#C23B3B",
  energy: "#E08A1E",
  protein: "#D9534F",
  fat: "#E5B93C",
  carbohydrate: "#4A90D9",
};

const dark: Palette = {
  background: "#101513",
  card: "#1B2320",
  text: "#EAF0EC",
  textMuted: "#9AA8A1",
  border: "#2C3833",
  primary: "#3DBB86",
  onPrimary: "#08150E",
  danger: "#E06666",
  energy: "#F0A23C",
  protein: "#E57A76",
  fat: "#EBC85C",
  carbohydrate: "#6AA9E8",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
