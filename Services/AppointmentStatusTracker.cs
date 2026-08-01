using System.Text.Json;
using Yoton_Mobile.Models;

namespace Yoton_Mobile.Services
{
    // Detects "Pending -> Scheduled" confirmations across app pages/sessions so the patient
    // gets a one-time in-app nudge without needing real push notifications (v1 scope: the
    // patient only finds out while the app is open/foregrounded, not while fully closed).
    // Shared by HomeViewModel and AppointmentsViewModel against the same snapshot key, so
    // whichever page loads first "claims" the diff and the other doesn't re-alert for it.
    public static class AppointmentStatusTracker
    {
        private const string PrefsKey = "appointment_status_snapshot";

        public static List<MyAppointment> DetectNewlyConfirmed(List<MyAppointment> current)
        {
            var previous = LoadSnapshot();
            var confirmed = new List<MyAppointment>();

            foreach (var appt in current)
            {
                if (appt.AppointmentId == null)
                    continue;

                if (previous.TryGetValue(appt.AppointmentId, out var previousStatus)
                    && previousStatus == "Pending"
                    && appt.Status == "Scheduled")
                {
                    confirmed.Add(appt);
                }
            }

            SaveSnapshot(current);
            return confirmed;
        }

        private static Dictionary<string, string> LoadSnapshot()
        {
            try
            {
                var json = Preferences.Get(PrefsKey, string.Empty);
                if (string.IsNullOrWhiteSpace(json))
                    return new Dictionary<string, string>();

                return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
            }
            catch (Exception)
            {
                return new Dictionary<string, string>();
            }
        }

        private static void SaveSnapshot(List<MyAppointment> current)
        {
            try
            {
                var map = current
                    .Where(a => a.AppointmentId != null)
                    .ToDictionary(a => a.AppointmentId!, a => a.Status);
                Preferences.Set(PrefsKey, JsonSerializer.Serialize(map));
            }
            catch (Exception)
            {
                // Best-effort only — a failed snapshot write just means the next load
                // re-diffs against a stale/empty baseline, not a crash.
            }
        }
    }
}
