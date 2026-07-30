using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public class PatientTask
    {
        public string Title { get; set; }
        public string Details { get; set; }
        public bool IsCompleted { get; set; }
        public string Time { get; set; }
    }

    public partial class HomeViewModel : BaseViewModel
    {
        private readonly ApiService _api;

        [ObservableProperty]
        string patientName = "Patient";

        // Shown as a horizontal carousel on the dashboard — capped at 5 so the card list
        // stays quick to skim; the Appointments tab shows the full list.
        [ObservableProperty]
        List<AppointmentItem> upcomingAppointments = new();

        [ObservableProperty]
        List<PatientTask> todayTasks;

        public HomeViewModel(ApiService api)
        {
            _api = api;
            Title = "Home";
        }

        public async Task InitializeAsync()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                PatientName = Preferences.Get("user_name", "Patient User");
                await LoadProfile();
                await LoadUpcomingAppointments();
                LoadDashboardMetrics();
            }
            finally
            {
                IsBusy = false;
            }
        }

        private void LoadDashboardMetrics()
        {
            TodayTasks = new List<PatientTask>
            {
                new PatientTask { Title = "Morning Blood Pressure", Details = "Target: below 120/80", Time = "8:00 AM", IsCompleted = true },
                new PatientTask { Title = "Take Lisinopril 10mg", Details = "1 Tablet with breakfast", Time = "8:30 AM", IsCompleted = false },
                new PatientTask { Title = "Take Metformin 500mg", Details = "1 Tablet with dinner", Time = "7:00 PM", IsCompleted = false }
            };
        }

        private async Task LoadProfile()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<MyProfile>>(APILibrary.Patient.Me);

                if (response?.Data != null && !string.IsNullOrWhiteSpace(response.Data.Name))
                {
                    PatientName = response.Data.Name;
                    Preferences.Set("user_name", response.Data.Name);
                }
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load profile: {ex}");
                // Keep the cached Preferences value when offline.
            }
        }

        // Used by the page's foreground poll timer — deliberately doesn't toggle IsBusy so
        // the glass busy overlay doesn't flash every minute while the patient is browsing.
        public Task RefreshSilentlyAsync() => LoadUpcomingAppointments();

        private async Task LoadUpcomingAppointments()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<MyAppointment>>>(APILibrary.Patient.Appointments);
                var appointments = response?.Data ?? new List<MyAppointment>();

                UpcomingAppointments = appointments
                    .Where(a => a.AppointmentDate >= DateTime.Now && a.Status != "Cancelled" && a.Status != "Completed")
                    .OrderBy(a => a.AppointmentDate)
                    .Take(5)
                    .Select(AppointmentsViewModel.ToAppointmentItem)
                    .ToList();

                // Diffed against the full list (not just the 5 shown here) so a confirmation
                // outside the top-5 window still surfaces the one-time nudge.
                await AppointmentsViewModel.NotifyNewlyConfirmedAsync(appointments);
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load upcoming appointments: {ex}");
                UpcomingAppointments = new List<AppointmentItem>();
            }
        }
    }
}
