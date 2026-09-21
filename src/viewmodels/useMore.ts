import { useCallback, useState } from "react";

import { prefs, PrefKeys } from "@/services/storage";
import { computeInitials } from "@/utils/initials";

// Hub for the 5th "More" tab: profile card plus links to Patient Perspective, Support and
// Settings. (Port of the MAUI MoreViewModel.)
export function useMore() {
  const [userName, setUserName] = useState("Patient User");
  const [userRole, setUserRole] = useState("Patient");

  // Re-read on every focus: Home/Settings may have refreshed the cached name since last visit.
  const refreshProfile = useCallback(async () => {
    setUserName(await prefs.getString(PrefKeys.userName, "Patient User"));
    setUserRole(await prefs.getString(PrefKeys.userRole, "Patient"));
  }, []);

  return { userName, userRole, userInitials: computeInitials(userName), refreshProfile };
}
