import { useCallback, useState } from "react";

import { useAlert } from "@/components/GlassDialogs";

export const WATER_GOAL_CUPS = 8;
export const STEP_GOAL = 10000;
const STEP_INCREMENT = 500;

// The wellbeing tracker. There's no backend endpoint for this journal, so everything lives in
// memory for the session - exactly as in the MAUI app. (Port of PatientPerspectiveViewModel.)
export function usePatientPerspective() {
  const { showAlert } = useAlert();

  const [moodScore, setMoodScore] = useState(7); // Default mood (Good)
  const [painScore, setPainScore] = useState(3); // Default pain (Mild)
  const [painLocation, setPainLocation] = useState("");
  const [waterIntakeCups, setWaterIntakeCups] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [healthJournal, setHealthJournal] = useState("");

  // Up to double the goal is allowed (a very hydrated day), matching the MAUI cap.
  const incrementWater = useCallback(() => {
    setWaterIntakeCups((cups) => (cups < WATER_GOAL_CUPS * 2 ? cups + 1 : cups));
  }, []);

  const addSteps = useCallback(() => setStepCount((steps) => steps + STEP_INCREMENT), []);

  const saveDailyLog = useCallback(async () => {
    // Be upfront that nothing is sent anywhere yet, rather than claiming it was shared.
    await showAlert({
      title: "Saved for now",
      message:
        "Your entries are kept on this device for this session only — sharing them with your care team isn't available yet.",
      confirmText: "OK",
    });
  }, [showAlert]);

  return {
    moodScore,
    setMoodScore,
    painScore,
    setPainScore,
    painLocation,
    setPainLocation,
    waterIntakeCups,
    waterProgress: waterIntakeCups / WATER_GOAL_CUPS,
    stepCount,
    stepProgress: stepCount / STEP_GOAL,
    healthJournal,
    setHealthJournal,
    incrementWater,
    addSteps,
    saveDailyLog,
  };
}
