/** Settings: profile, goals, language, OpenAI key and model, Open Food Facts sharing. */
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, View } from "react-native";
import { removeOpenAiKey, readOpenAiKey, saveOpenAiKey } from "../../src/data/StoreSecret";
import type { LanguageSetting } from "../../src/data/StoreSettings";
import { calculateGoal } from "../../src/domain/CalculatorGoal";
import { parseNumberText } from "../../src/domain/ParserFoodForm";
import type { ActivityLevel, NutrientGoal, Profile, Sex } from "../../src/domain/Models";
import { changeLanguage } from "../../src/i18n/Index";
import { Button, Card, Field, ScreenScroll, Segmented, TextBody, TextHeading } from "../../src/ui/components/Primitives";
import { useServices } from "../../src/ui/Services";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { settings } = useServices();

  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("normal");
  const [overrides, setOverrides] = useState({ energyKcal: "", proteinG: "", fatG: "", carbohydrateG: "" });
  const [language, setLanguage] = useState<LanguageSetting>("system");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState("");
  const [contribute, setContribute] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const profile = settings.getProfile();
      if (profile) {
        setSex(profile.sex);
        setAge(String(profile.age));
        setHeight(String(profile.heightCm));
        setWeight(String(profile.weightKg));
        setActivity(profile.activity);
      }
      const saved = settings.getGoalOverrides();
      setOverrides({ energyKcal: saved.energyKcal?.toString() ?? "", proteinG: saved.proteinG?.toString() ?? "", fatG: saved.fatG?.toString() ?? "", carbohydrateG: saved.carbohydrateG?.toString() ?? "" });
      setLanguage(settings.getLanguage());
      setModel(settings.getOpenAiModel());
      setContribute(settings.getContributeToOff());
      void readOpenAiKey().then((key) => setHasKey(Boolean(key)));
    }, [settings]),
  );

  const parsedProfile = (): Profile | null => {
    const values = [parseNumberText(age), parseNumberText(height), parseNumberText(weight)];
    if (values.some((v) => v === null || v === 0)) return null;
    return { sex, age: values[0]!, heightCm: values[1]!, weightKg: values[2]!, activity };
  };
  const profile = parsedProfile();
  const computed = profile ? calculateGoal(profile) : null;

  const saveProfileAndGoals = () => {
    if (profile) settings.setProfile(profile);
    const next: Partial<NutrientGoal> = {};
    for (const key of ["energyKcal", "proteinG", "fatG", "carbohydrateG"] as const) {
      const value = parseNumberText(overrides[key]);
      if (value) next[key] = value;
    }
    settings.setGoalOverrides(next);
    setMessage(t("settings.saved"));
  };

  const hint = (key: keyof NutrientGoal) => (computed ? String(computed[key]) : "");

  return (
    <ScreenScroll>
      <Card>
        <TextHeading>{t("settings.profile")}</TextHeading>
        <Segmented<Sex> options={[{ value: "male", label: t("settings.male") }, { value: "female", label: t("settings.female") }]} value={sex} onChange={setSex} />
        <Field label={t("settings.age")} value={age} onChangeText={setAge} keyboardType="number-pad" testID="profile-age" />
        <Field label={t("settings.height")} value={height} onChangeText={setHeight} keyboardType="decimal-pad" testID="profile-height" />
        <Field label={t("settings.weight")} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" testID="profile-weight" />
        <TextBody muted small>{t("settings.activity")}</TextBody>
        <Segmented<ActivityLevel> options={[{ value: "low", label: t("settings.low") }, { value: "normal", label: t("settings.normal") }, { value: "high", label: t("settings.high") }]} value={activity} onChange={setActivity} />
      </Card>

      <Card>
        <TextHeading>{t("settings.goals")}</TextHeading>
        <TextBody muted small>{t("settings.goalsHint")}</TextBody>
        <Field label={t("settings.overrideEnergy")} value={overrides.energyKcal} placeholder={hint("energyKcal")} onChangeText={(v) => setOverrides({ ...overrides, energyKcal: v })} keyboardType="decimal-pad" testID="goal-energy" />
        <Field label={t("settings.overrideProtein")} value={overrides.proteinG} placeholder={hint("proteinG")} onChangeText={(v) => setOverrides({ ...overrides, proteinG: v })} keyboardType="decimal-pad" />
        <Field label={t("settings.overrideFat")} value={overrides.fatG} placeholder={hint("fatG")} onChangeText={(v) => setOverrides({ ...overrides, fatG: v })} keyboardType="decimal-pad" />
        <Field label={t("settings.overrideCarbs")} value={overrides.carbohydrateG} placeholder={hint("carbohydrateG")} onChangeText={(v) => setOverrides({ ...overrides, carbohydrateG: v })} keyboardType="decimal-pad" />
        <Button label={t("common.save")} onPress={saveProfileAndGoals} testID="save-profile" />
        {message ? <TextBody small muted>{message}</TextBody> : null}
      </Card>

      <Card>
        <TextHeading>{t("settings.language")}</TextHeading>
        <Segmented<LanguageSetting>
          options={[{ value: "system", label: t("settings.system") }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]}
          value={language}
          onChange={(value) => {
            setLanguage(value);
            settings.setLanguage(value);
            changeLanguage(value);
          }}
        />
      </Card>

      <Card>
        <TextHeading>{t("settings.ai")}</TextHeading>
        <Field label={t("settings.apiKey")} value={apiKey} onChangeText={setApiKey} secure placeholder={hasKey ? "••••••••" : "sk-…"} testID="api-key" />
        <TextBody muted small>{t("settings.apiKeyHint")}</TextBody>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={t("common.save")}
              disabled={apiKey.trim() === ""}
              onPress={() =>
                void saveOpenAiKey(apiKey).then(() => {
                  setApiKey("");
                  setHasKey(true);
                  setMessage(t("settings.apiKeySaved"));
                })
              }
            />
          </View>
          {hasKey ? (
            <View style={{ flex: 1 }}>
              <Button label={t("settings.apiKeyRemove")} variant="danger" onPress={() => void removeOpenAiKey().then(() => setHasKey(false))} />
            </View>
          ) : null}
        </View>
        <Field label={t("settings.model")} value={model} onChangeText={(value) => { setModel(value); settings.setOpenAiModel(value); }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextBody>{t("settings.contribute")}</TextBody>
          </View>
          <Switch value={contribute} onValueChange={(value) => { setContribute(value); settings.setContributeToOff(value); }} />
        </View>
      </Card>

      <Card>
        <TextHeading>{t("settings.about")}</TextHeading>
        <TextBody muted small>{t("settings.attribution")}</TextBody>
      </Card>
    </ScreenScroll>
  );
}
