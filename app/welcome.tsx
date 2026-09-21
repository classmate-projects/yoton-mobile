import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Animated, Easing, Image, StyleSheet, View, useAnimatedValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { GradientButton } from "@/components/AppButton";
import { APP_VERSION } from "@/config/env";
import { argb, palette } from "@/theme/colors";
import { shadow } from "@/theme/shadow";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/typography";

const FEATURES = [
  { icon: "📅", text: "Book & manage appointments instantly" },
  { icon: "🩺", text: "Consult your care team from anywhere" },
  { icon: "💊", text: "Track prescriptions, labs & records in one place" },
];

const cubic = Easing.out(Easing.cubic);

// The marketing landing page shown to signed-out users. (Port of the MAUI WelcomePage, including
// its staggered entrance: brand copy -> features -> Get Started -> trust badges, then the gentle
// looping pulses on the illustration and the call-to-action.)
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const header = useAnimatedValue(0);
  const features = useAnimatedValue(0);
  const cta = useAnimatedValue(0);
  const ctaScale = useAnimatedValue(0.88);
  const badges = useAnimatedValue(0);
  const illustrationPulse = useAnimatedValue(0);
  const ctaPulse = useAnimatedValue(0);

  useEffect(() => {
    const pulse = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );

    const illustrationLoop = pulse(illustrationPulse, 3200);
    illustrationLoop.start();

    let ctaLoop: Animated.CompositeAnimation | null = null;
    const entrance = Animated.sequence([
      Animated.timing(header, { toValue: 1, duration: 900, easing: cubic, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(features, { toValue: 1, duration: 600, easing: cubic, useNativeDriver: true }),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(cta, { toValue: 1, duration: 500, easing: cubic, useNativeDriver: true }),
        Animated.spring(ctaScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.timing(badges, { toValue: 1, duration: 700, easing: cubic, useNativeDriver: true }),
    ]);
    entrance.start(({ finished }) => {
      if (!finished) return;
      // Gentle continuous "breathing" pulse invites the tap once everything has settled in.
      ctaLoop = pulse(ctaPulse, 1800);
      ctaLoop.start();
    });

    return () => {
      illustrationLoop.stop();
      entrance.stop();
      ctaLoop?.stop();
    };
  }, [header, features, cta, ctaScale, badges, illustrationPulse, ctaPulse]);

  const slideIn = (value: Animated.Value, distance: number) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  const softText = theme.isDark ? palette.neutral[300] : palette.neutral[700];
  const badgeSurface = theme.isDark ? "#141828" : "#FFFFFF";
  const badgeTitle = theme.isDark ? "#FFFFFF" : palette.neutral[900];

  return (
    <View style={[styles.fill, { backgroundColor: theme.authBg }]}>
      {/* HERO */}
      <View style={styles.hero}>
        <LinearGradient
          colors={theme.isDark ? ["#0D1428", "#080B12"] : ["#EBF0FF", "#F4F7FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Decorative orbs */}
        <View style={[styles.orb, { width: 220, height: 220, left: -60, top: -50, backgroundColor: argb("#150055CC") }]} />
        <View style={[styles.orb, { width: 140, height: 140, right: -40, top: "50%", marginTop: -30, backgroundColor: argb("#15008C8C") }]} />

        <View style={styles.heroContent}>
          <Animated.View
            style={{
              width: 190,
              height: 190,
              transform: [{ scale: illustrationPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
            }}
          >
            <View style={styles.ringLayer}>
              <View style={{ width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: palette.primary[300], opacity: 0.15 }} />
            </View>
            <View style={styles.ringLayer}>
              <View style={{ width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: palette.primary[500], opacity: 0.2 }} />
            </View>
            <View style={styles.ringLayer}>
              <View style={[{ width: 108, height: 108, borderRadius: 54, backgroundColor: badgeSurface, alignItems: "center", justifyContent: "center" }, shadow("#0055CC", 8, 22, 0.18)]}>
                <Image source={require("../assets/images/app-logo.png")} style={{ width: 66, height: 66 }} resizeMode="contain" />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[{ alignItems: "center", gap: 10 }, slideIn(header, 24)]}>
            <AppText
              center
              size={36}
              color={theme.isDark ? "#FFFFFF" : palette.primary[900]}
              style={{ fontFamily: fonts.publicSansBold }}
            >
              Yoton Health
            </AppText>
            <AppText
              center
              size={15}
              color={softText}
              style={{ fontFamily: fonts.notoSansRegular, lineHeight: 21, marginHorizontal: 10 }}
            >
              {"Precision outpatient care,\ndelivered through your fingertips."}
            </AppText>
          </Animated.View>
        </View>
      </View>

      {/* FOOTER ACTIONS */}
      <View style={[styles.footer, { paddingBottom: Math.max(36, insets.bottom + 16) }]}>
        <Animated.View style={[{ gap: 12 }, slideIn(features, 14)]}>
          {FEATURES.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <AppText size={16}>{feature.icon}</AppText>
              <AppText size={13} color={softText} style={{ fontFamily: fonts.notoSansRegular }}>
                {feature.text}
              </AppText>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          style={[
            shadow("#0055CC", 8, 16, 0.28),
            {
              borderRadius: 16,
              opacity: cta,
              transform: [
                { scale: Animated.multiply(ctaScale, ctaPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })) },
              ],
            },
          ]}
        >
          <GradientButton
            title="Get Started"
            colors={[palette.primary[700], palette.secondary[500]]}
            height={54}
            radius={16}
            fontSize={17}
            onPress={() => router.push("/login")}
          />
        </Animated.View>

        <Animated.View style={[styles.badgeRow, slideIn(badges, 16)]}>
          <TrustBadge icon="🧬" title="Clinical Grade" subtitle="ISO Certified" stroke="#280055CC" surface={badgeSurface} titleColor={badgeTitle} />
          <TrustBadge icon="🔒" title="HIPAA Secure" subtitle="256-bit Encrypted" stroke="#28008C8C" surface={badgeSurface} titleColor={badgeTitle} />
        </Animated.View>

        <AppText center size={11} color={palette.neutral[500]} style={{ fontFamily: fonts.notoSansLight }}>
          {`Yoton Health v${APP_VERSION}`}
        </AppText>
      </View>
    </View>
  );
}

function TrustBadge(props: {
  icon: string;
  title: string;
  subtitle: string;
  stroke: string;
  surface: string;
  titleColor: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: props.surface, borderColor: argb(props.stroke) }]}>
      <AppText size={15}>{props.icon}</AppText>
      <View style={{ gap: 1 }}>
        <AppText size={11} color={props.titleColor} style={{ fontFamily: fonts.publicSansBold }}>
          {props.title}
        </AppText>
        <AppText size={9} color={palette.neutral[500]} style={{ fontFamily: fonts.notoSansLight }}>
          {props.subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { flex: 1, overflow: "hidden" },
  orb: { position: "absolute", borderRadius: 999 },
  heroContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 30 },
  ringLayer: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 30, gap: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badgeRow: { flexDirection: "row", gap: 12 },
  badge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
});
