using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;

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

        [ObservableProperty]
        string nextAppointmentDoctor = "No upcoming appointments";

        [ObservableProperty]
        string nextAppointmentSpecialty = "Book a visit to get started";

        [ObservableProperty]
        string nextAppointmentTime = "";

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
                await LoadNextAppointment();
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
            catch (Exception)
            {
                // Keep the cached Preferences value when offline.
            }
        }

        private async Task LoadNextAppointment()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<MyAppointment>>>(APILibrary.Patient.Appointments);
                var appointments = response?.Data ?? new List<MyAppointment>();

                var next = appointments
                    .Where(a => a.AppointmentDate >= DateTime.Now && a.Status != "Cancelled" && a.Status != "Completed")
                    .OrderBy(a => a.AppointmentDate)
                    .FirstOrDefault();

                if (next != null)
                {
                    NextAppointmentDoctor = next.DoctorName;
                    NextAppointmentSpecialty = next.SpecializationName ?? "General Consultation";
                    NextAppointmentTime = next.AppointmentDate.ToString("dddd, MMMM d 'at' h:mm tt");
                }
                else
                {
                    NextAppointmentDoctor = "No upcoming appointments";
                    NextAppointmentSpecialty = "Book a visit to get started";
                    NextAppointmentTime = "";
                }
            }
            catch (Exception)
            {
                NextAppointmentDoctor = "Unable to load appointments";
                NextAppointmentSpecialty = "";
                NextAppointmentTime = "";
            }
        }
    }
}
