import Slider from "@react-native-community/slider";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppText, type AppTextProps } from "@/components/AppText";
import { Card } from "@/components/Card";
import { KeyboardAvoid } from "@/components/KeyboardAvoid";
import { Divider, ScreenScroll } from "@/components/layout";
import { palette } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";
import { STEP_GOAL, usePatientPerspective, WATER_GOAL_CUPS } from "@/viewmodels/usePatientPerspective";

// Subjective recovery tracker: mood, pain, water, steps and a symptom journal. Session-only, as in
// the MAUI app. (Port of the MAUI PatientPerspectivePage.)
export default function PatientPerspectiveScreen() {
  const theme = useTheme();
  const p = usePatientPerspective();

  const inputStyle = {
    color: theme.isDark ? "#FFFFFF" : palette.neutral[900],
    fontFamily: fonts.notoSansRegular,
    fontSize: 14,
  };

  return (
    <KeyboardAvoid underHeader>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.fill}>
        <ScreenScroll bottomInset>
          <View style={{ gap: 4 }}>
            <AppText variant="h2" bold>
              Patient Perspective
            </AppText>
            <AppText variant="labelLight">Log your subjective recovery status to keep your care circle informed.</AppText>
          </View>

          {/* MOOD & PAIN */}
          <Card radius={16} padding={20} style={{ gap: 15 }}>
            <View style={{ gap: 5 }}>
              <View style={styles.spread}>
                <AppText bold size={15}>
                  How are you feeling today?
                </AppText>
                <AppText bold color={palette.primary[500]}>{`${Math.round(p.moodScore)}/10`}</AppText>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={p.moodScore}
                onValueChange={p.setMoodScore}
                minimumTrackTintColor={palette.primary[500]}
                maximumTrackTintColor={palette.neutral[100]}
                thumbTintColor={palette.primary[500]}
                accessibilityLabel="Mood score"
              />
              <View style={[styles.spread, { marginTop: -5 }]}>
                <SliderCaption>😔 Poor</SliderCaption>
                <SliderCaption>😐 Normal</SliderCaption>
                <SliderCaption>😊 Great</SliderCaption>
              </View>
            </View>

            <Divider style={{ marginVertical: 5 }} />

            <View style={{ gap: 5 }}>
              <View style={styles.spread}>
                <AppText bold size={15}>
                  Pain Level (0 = No Pain)
                </AppText>
                <AppText bold color={palette.tertiary[500]}>{`${Math.round(p.painScore)}/10`}</AppText>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={p.painScore}
                onValueChange={p.setPainScore}
                minimumTrackTintColor={palette.tertiary[500]}
                maximumTrackTintColor={palette.neutral[100]}
                thumbTintColor={palette.tertiary[500]}
                accessibilityLabel="Pain score"
              />

              <AppText variant="labelLight" style={{ marginTop: 5, marginBottom: 2 }}>
                Where is the pain located?
              </AppText>
              <TextInput
                underlineColorAndroid="transparent"
                value={p.painLocation}
                onChangeText={p.setPainLocation}
                placeholder="e.g. Lower back, right shoulder"
                placeholderTextColor={theme.placeholder}
                style={[inputStyle, styles.entry, { borderBottomColor: theme.divider }]}
              />
            </View>
          </Card>

          {/* DAILY TARGETS */}
          <AppText variant="h3" bold>
            Daily Vitals & Activity
          </AppText>

          <View style={{ flexDirection: "row", gap: 15 }}>
            <Card radius={14} padding={15} style={styles.tracker}>
              <AppText bold size={14} center>
                💧 Water Intake
              </AppText>
              <AppText center>
                <AppText bold size={20} color={palette.primary[500]}>
                  {p.waterIntakeCups}
                </AppText>
                <AppText size={14}>{" / "}</AppText>
                <AppText variant="labelLight" size={14}>
                  {WATER_GOAL_CUPS}
                </AppText>
                <AppText size={12}>{" cups"}</AppText>
              </AppText>
              <ProgressBar progress={p.waterProgress} color={palette.primary[500]} />
              <AppButton title="+ Cup" fontSize={12} height={35} style={{ paddingVertical: 0, paddingHorizontal: 0 }} onPress={p.incrementWater} />
            </Card>

            <Card radius={14} padding={15} style={styles.tracker}>
              <AppText bold size={14} center>
                👟 Daily Steps
              </AppText>
              <AppText center>
                <AppText bold size={20} color={palette.secondary[500]}>
                  {p.stepCount}
                </AppText>
                <AppText size={14}>{" / "}</AppText>
                <AppText variant="labelLight" size={12}>
                  {STEP_GOAL}
                </AppText>
              </AppText>
              <ProgressBar progress={p.stepProgress} color={palette.secondary[500]} />
              <AppButton
                title="+ 500"
                fontSize={12}
                height={35}
                backgroundColor={palette.secondary[500]}
                style={{ paddingVertical: 0, paddingHorizontal: 0 }}
                onPress={p.addSteps}
              />
            </Card>
          </View>

          {/* JOURNAL */}
          <AppText variant="h3" bold>
            Symptoms & Recovery Journal
          </AppText>
          <Card radius={16} padding={15} style={{ gap: 10 }}>
            <TextInput
              underlineColorAndroid="transparent"
              value={p.healthJournal}
              onChangeText={p.setHealthJournal}
              placeholder="Write notes about your symptoms, mobility, or medication side effects..."
              placeholderTextColor={theme.placeholder}
              multiline
              textAlignVertical="top"
              style={[inputStyle, { minHeight: 100 }]}
            />
            <AppButton
              title="Share Log with Doctors"
              onPress={() => void p.saveDailyLog()}
              style={{ alignSelf: "flex-end", marginTop: 5 }}
            />
          </Card>
        </ScreenScroll>
      </Pressable>
    </KeyboardAvoid>
  );
}

function SliderCaption({ children }: { children: AppTextProps["children"] }) {
  return (
    <AppText variant="labelLight" size={12}>
      {children}
    </AppText>
  );
}

// MAUI ProgressBar: a 6pt rounded track, filled to `progress` (clamped to 0..1).
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: theme.isDark ? palette.neutral[700] : palette.neutral[100] }]}>
      <View style={{ width: `${clamped * 100}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entry: { borderBottomWidth: 1, paddingVertical: 8, paddingHorizontal: 0 },
  tracker: { flex: 1, gap: 8 },
  track: { height: 6, borderRadius: 3, marginVertical: 5, overflow: "hidden" },
});
