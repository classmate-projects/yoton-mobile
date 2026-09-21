import { useCallback } from "react";
import { Linking } from "react-native";

import { withoutAppLock } from "@/services/appLock";
import { LogService } from "@/services/logger";

export interface ContactItem {
  name: string;
  role: string;
  phone: string;
  email: string;
}

// Clinic details are hardcoded placeholders in the MAUI app too (no clinic-profile endpoint feeds
// the patient app yet).
const CLINIC = {
  name: "Yoton Clinic Center",
  phone: "+1 (800) 555-0199",
  address: "100 Medical Plaza, Suite A, New York, NY 10001",
};

// Personal emergency/care-circle contacts are patient-entered data with no backing API yet, so
// this starts empty rather than showing another patient's fixture data.
const CARE_CIRCLE: ContactItem[] = [];

// Opens the system dialer. `tel:` needs the number without spaces/brackets to be reliable.
async function callNumber(phoneNumber: string): Promise<void> {
  try {
    await withoutAppLock(() => Linking.openURL(`tel:${phoneNumber.replace(/[^\d+]/g, "")}`));
  } catch (error) {
    // No dialer available on this device (e.g. a tablet/emulator without telephony) - ignore.
    LogService.write(`Could not open dialer: ${error}`);
  }
}

export function useSupport() {
  const callContact = useCallback((contact: ContactItem) => {
    if (contact.phone) void callNumber(contact.phone);
  }, []);

  const callClinic = useCallback(() => void callNumber(CLINIC.phone), []);

  return {
    clinicName: CLINIC.name,
    clinicPhone: CLINIC.phone,
    clinicAddress: CLINIC.address,
    careCircle: CARE_CIRCLE,
    callContact,
    callClinic,
  };
}
