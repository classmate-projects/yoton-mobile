using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Controls;
using Yoton_Mobile.Models;

namespace Yoton_Mobile.ViewModels
{
    public class AppointmentItem
    {
        public string? AppointmentId { get; set; }
        public string DoctorName { get; set; }
        public string Specialty { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public string Status { get; set; }
        public string Location { get; set; }
    }

    public partial class AppointmentsViewModel : BaseViewModel
    {
        private readonly ApiService _api;
        private List<MyConsultation> _consultations = new();

        [ObservableProperty]
        List<AppointmentItem> upcomingAppointments = new();

        [ObservableProperty]
        List<AppointmentItem> pastAppointments = new();

        public AppointmentsViewModel(ApiService api)
        {
            _api = api;
            Title = "Appointments";
        }

        public async Task InitializeAsync()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                await LoadAppointments();
            }
            finally
            {
                IsBusy = false;
            }
        }

        private async Task LoadAppointments()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<List<MyAppointment>>>(APILibrary.Patient.Appointments);
                var appointments = response?.Data ?? new List<MyAppointment>();

                var now = DateTime.Now;

                UpcomingAppointments = appointments
                    .Where(a => a.AppointmentDate >= now && a.Status != "Cancelled" && a.Status != "Completed")
                    .OrderBy(a => a.AppointmentDate)
                    .Select(ToAppointmentItem)
                    .ToList();

                PastAppointments = appointments
                    .Where(a => a.AppointmentDate < now || a.Status == "Cancelled" || a.Status == "Completed")
                    .OrderByDescending(a => a.AppointmentDate)
                    .Select(ToAppointmentItem)
                    .ToList();

                var consultationsResponse = await _api.GetAsync<ApiEnvelope<List<MyConsultation>>>(APILibrary.Patient.Consultations);
                _consultations = consultationsResponse?.Data ?? new List<MyConsultation>();
            }
            catch (Exception)
            {
                UpcomingAppointments = new List<AppointmentItem>();
                PastAppointments = new List<AppointmentItem>();
            }
        }

        private static AppointmentItem ToAppointmentItem(MyAppointment a) => new()
        {
            AppointmentId = a.AppointmentId,
            DoctorName = a.DoctorName,
            Specialty = a.SpecializationName ?? "General Consultation",
            Date = a.AppointmentDate.ToString("dddd, MMMM d"),
            Time = a.AppointmentDate.ToString("h:mm tt"),
            Status = a.Status,
            Location = a.SpecializationName != null ? $"{a.SpecializationName} Department" : "Yoton Health Clinic"
        };

        [RelayCommand]
        private async Task ScheduleNewAppointment()
        {
            if (Shell.Current.CurrentPage is ContentPage page)
            {
                await LiquidGlassAlert.ShowAsync(
                    page,
                    "Scheduling is almost ready",
                    "Appointment booking will be available in an upcoming Yoton Health release.",
                    "Understood");
            }
        }

        [RelayCommand]
        private async Task ShowConsultationNotes(AppointmentItem appointment)
        {
            if (appointment == null || Shell.Current.CurrentPage is not ContentPage page)
                return;

            var consultation = _consultations.FirstOrDefault(c => c.AppointmentId == appointment.AppointmentId);

            if (consultation == null)
            {
                await LiquidGlassAlert.ShowAsync(
                    page,
                    "No consultation notes yet",
                    "Your doctor hasn't recorded consultation details for this visit yet.",
                    "Understood");
                return;
            }

            var message = string.Join("\n\n", new[]
            {
                !string.IsNullOrWhiteSpace(consultation.ChiefComplaint) ? $"Reason for visit: {consultation.ChiefComplaint}" : null,
                !string.IsNullOrWhiteSpace(consultation.DiagnosisDescription) ? $"Diagnosis: {consultation.DiagnosisDescription}" : null,
                !string.IsNullOrWhiteSpace(consultation.PlannedProcedures) ? $"Plan: {consultation.PlannedProcedures}" : null
            }.Where(s => s != null));

            await LiquidGlassAlert.ShowAsync(
                page,
                $"Consultation with {consultation.DoctorName}",
                string.IsNullOrWhiteSpace(message) ? "No further details were recorded for this consultation." : message,
                "Close");
        }
    }
}
