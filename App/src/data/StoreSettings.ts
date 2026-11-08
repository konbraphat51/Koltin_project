/** Non-secret settings kept in a synchronous key-value store (expo-sqlite kv-store in the app, a Map in tests). */
import { z } from "zod";
import type { NutrientGoal, Profile } from "../domain/Models";

export interface KeyValueStore {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): boolean | void;
}

export type LanguageSetting = "system" | "en" | "ja";

const ProfileSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().min(1).max(120),
  heightCm: z.number().min(50).max(250),
  weightKg: z.number().min(10).max(300),
  activity: z.enum(["low", "normal", "high"]),
});

const GoalOverridesSchema = z.object({ energyKcal: z.number().positive().optional(), proteinG: z.number().positive().optional(), fatG: z.number().positive().optional(), carbohydrateG: z.number().positive().optional() });

export const defaultOpenAiModel = "gpt-5-nano";

export class StoreSettings {
  constructor(
    private readonly store: KeyValueStore,
    private readonly createId: () => string,
  ) {}

  private readJson<T>(key: string, schema: z.ZodType<T>): T | null {
    const raw = this.store.getItemSync(key);
    if (raw === null) return null;
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  getProfile(): Profile | null {
    return this.readJson("profile", ProfileSchema);
  }
  setProfile(profile: Profile): void {
    this.store.setItemSync("profile", JSON.stringify(profile));
  }

  getGoalOverrides(): Partial<NutrientGoal> {
    return this.readJson("goalOverrides", GoalOverridesSchema) ?? {};
  }
  setGoalOverrides(overrides: Partial<NutrientGoal>): void {
    this.store.setItemSync("goalOverrides", JSON.stringify(overrides));
  }

  getLanguage(): LanguageSetting {
    const value = this.store.getItemSync("language");
    return value === "en" || value === "ja" ? value : "system";
  }
  setLanguage(language: LanguageSetting): void {
    this.store.setItemSync("language", language);
  }

  getOpenAiModel(): string {
    return this.store.getItemSync("openAiModel") || defaultOpenAiModel;
  }
  setOpenAiModel(model: string): void {
    this.store.setItemSync("openAiModel", model.trim());
  }

  /** Whether newly photographed products are contributed to Open Food Facts (default on). */
  getContributeToOff(): boolean {
    return this.store.getItemSync("contributeToOff") !== "0";
  }
  setContributeToOff(isEnabled: boolean): void {
    this.store.setItemSync("contributeToOff", isEnabled ? "1" : "0");
  }

  /** Random ID sent to the server for rate limiting; created on first use. */
  getInstallationId(): string {
    const existing = this.store.getItemSync("installationId");
    if (existing) return existing;
    const id = this.createId();
    this.store.setItemSync("installationId", id);
    return id;
  }
}
