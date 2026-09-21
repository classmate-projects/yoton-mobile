import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ScreenScroll } from "@/components/layout";
import { palette } from "@/theme/colors";
import { useSupport } from "@/viewmodels/useSupport";

// Clinic contact card and the patient's care circle. (Port of the MAUI SupportPage.)
export default function SupportScreen() {
  const { clinicName, clinicPhone, clinicAddress, careCircle, callContact, callClinic } = useSupport();

  return (
    <ScreenScroll bottomInset>
      <View style={{ gap: 4 }}>
        <AppText variant="h2" bold>
          Clinic & Support Circle
        </AppText>
        <AppText variant="labelLight">
          Direct communication channels for emergency, pharmacy, and clinic support.
        </AppText>
      </View>

      {/* CLINIC INFORMATION CARD */}
      <Card radius={16} padding={20} backgroundColor={palette.primary[700]} style={{ gap: 10 }}>
        <AppText bold size={11} color={palette.primary[100]} style={{ letterSpacing: 1 }}>
          PRIMARY MEDICAL CENTER
        </AppText>
        <AppText variant="h3" bold color="#FFFFFF">
          {clinicName}
        </AppText>

        <View style={{ height: 1, backgroundColor: palette.primary[300], marginVertical: 5 }} />

        <Pressable accessibilityRole="button" accessibilityLabel={`Call ${clinicPhone}`} onPress={callClinic} style={styles.infoRow}>
          <AppText size={16}>📞</AppText>
          <AppText bold size={14} color="#FFFFFF">
            {clinicPhone}
          </AppText>
        </Pressable>

        <View style={[styles.infoRow, { alignItems: "flex-start", marginTop: 5 }]}>
          <AppText size={16}>📍</AppText>
          <AppText size={13} color={palette.primary[100]} style={{ flex: 1 }}>
            {clinicAddress}
          </AppText>
        </View>
      </Card>

      {/* CARE CIRCLE */}
      <AppText variant="h3" bold style={{ marginTop: 10 }}>
        Your Care Circle
      </AppText>

      {careCircle.length === 0 ? (
        <View style={{ padding: 20, alignItems: "center" }}>
          <AppText variant="labelLight" center>
            No emergency contacts added yet.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {careCircle.map((contact, index) => (
            <Card key={`${contact.name}-${index}`} padding={15} style={styles.contactRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText bold size={15}>
                  {contact.name}
                </AppText>
                <AppText variant="labelLight" size={12}>
                  {contact.role}
                </AppText>
                <View style={{ flexDirection: "row", gap: 15, marginTop: 4, flexWrap: "wrap" }}>
                  <AppText variant="label" size={12}>{`📞 ${contact.phone}`}</AppText>
                  <AppText variant="labelLight" size={12}>{`✉️ ${contact.email}`}</AppText>
                </View>
              </View>
              <AppButton
                title="Call"
                fontSize={12}
                height={35}
                backgroundColor={palette.secondary[500]}
                textColor="#FFFFFF"
                style={{ width: 60, paddingHorizontal: 0, paddingVertical: 0 }}
                onPress={() => callContact(contact)}
              />
            </Card>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
