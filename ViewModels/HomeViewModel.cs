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
        List<PatientTask> todayTasks = new();

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
                await LoadActiveMedications();
            }
            finally
            {
                IsBusy = false;
            }
        }

        // Previously hardcoded sample data (specific drug names/doses/times) presented as if
        // it were the patient's real schedule. There's no dose-tracking backend to say whether
        // a given dose was actually taken today, so this shows real active prescriptions
        // instead of fabricating one — genuinely useful without pretending to know more than we do.
        private async Task LoadActiveMedications()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<MyMedication>>>(APILibrary.Patient.Prescriptions);
                var medications = response?.Data ?? new List<MyMedication>();

                TodayTasks = medications
                    .Where(m => m.Status == "Active")
                    .OrderByDescending(m => m.StartedAt)
                    .Select(m => new PatientTask
                    {
                        Title = m.DrugName,
                        Details = string.Join(" • ", new[] { m.Dosage, m.Frequency }.Where(s => !string.IsNullOrWhiteSpace(s)))
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load active medications: {ex}");
                TodayTasks = new List<PatientTask>();
            }
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
