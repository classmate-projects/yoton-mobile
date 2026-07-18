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
        string nextAppointmentDoctor = "Dr. Sarah Jenkins";

        [ObservableProperty]
        string nextAppointmentTime = "Monday, July 20 at 10:30 AM";

        [ObservableProperty]
        List<PatientTask> todayTasks;

        [ObservableProperty]
        List<Patient> patients;

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
                await LoadPatients();
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

        private async Task LoadPatients()
        {
            try
            {
                var response = await _api.GetAsync<PatientResponse>(APILibrary.Patient.GetAllPatients);

                if (response != null)
                    Patients = response.Patients;
            }
            catch (Exception)
            {
                // Fallback for offline/test environments
                Patients = new List<Patient>
                {
                    new Patient { OpId = "1", Name = "John Doe", Email = "john@example.com", Phone = "555-0199", Address = "NY City", DateOfBirth = "1988-12-05" }
                };
            }
        }
    }
}
