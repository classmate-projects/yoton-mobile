using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Controls;
using Yoton_Mobile.Models;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class AppointmentsViewModel : BaseViewModel
    {
        private readonly ApiService _api;
        private List<MyConsultation> _consultations = new();
        private List<SpecializationDoctors> _specializationGroups = new();

        [ObservableProperty]
        List<AppointmentItem> upcomingAppointments = new();

        [ObservableProperty]
        List<AppointmentItem> pastAppointments = new();

        // ---------------- Inline "request an appointment" panel ----------------
        // Deliberately a collapsible section on this same page/ViewModel rather than a
        // separate Page — the patient never leaves the Appointments screen to book.

        [ObservableProperty]
        bool isBookingPanelOpen;

        [ObservableProperty]
        bool isLoadingDoctors;

        [ObservableProperty]
        bool isLoadingSlots;

        [ObservableProperty]
        bool isBookingSubmitting;

        [ObservableProperty]
        List<string> specializationNames = new();

        [ObservableProperty]
        string selectedSpecializationName = "All";

        [ObservableProperty]
        List<DoctorCard> doctorCards = new();

        // Up to 3 ranked preferences; picking the 1st doctor's slots first, falling back to
        // the 2nd/3rd if the current preference has none available on the chosen date.
        [ObservableProperty]
        ObservableCollection<DoctorCard> preferredDoctors = new();

        [ObservableProperty]
        DoctorCard? activePreference;

        [ObservableProperty]
        DateTime selectedBookingDate = DateTime.Today;

        [ObservableProperty]
        List<PatientSlot> availableSlots = new();

        [ObservableProperty]
        PatientSlot? selectedSlot;

        [ObservableProperty]
        string bookingNotes = string.Empty;

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

        // Used by the page's foreground poll timer — deliberately doesn't toggle IsBusy so
        // the glass busy overlay doesn't flash every minute while the patient is browsing.
        public Task RefreshSilentlyAsync() => LoadAppointments();

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

                await NotifyNewlyConfirmedAsync(appointments);
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load appointments: {ex}");
                UpcomingAppointments = new List<AppointmentItem>();
                PastAppointments = new List<AppointmentItem>();
            }
        }

        // internal: also called from HomeViewModel so the confirmation nudge fires once,
        // from whichever page loads the appointment list first.
        internal static async Task NotifyNewlyConfirmedAsync(List<MyAppointment> appointments)
        {
            var newlyConfirmed = AppointmentStatusTracker.DetectNewlyConfirmed(appointments);
            if (newlyConfirmed.Count == 0 || Shell.Current.CurrentPage is not ContentPage page)
                return;

            var first = newlyConfirmed[0];
            var suffix = newlyConfirmed.Count > 1 ? $" (and {newlyConfirmed.Count - 1} more)" : "";

            await LiquidGlassAlert.ShowAsync(
                page,
                "Appointment confirmed!",
                $"Your appointment with {first.DoctorName} on {first.AppointmentDate:dddd, MMMM d 'at' h:mm tt} has been confirmed{suffix}.",
                "Great");
        }

        public static AppointmentItem ToAppointmentItem(MyAppointment a) => new()
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
            IsBookingPanelOpen = !IsBookingPanelOpen;
            if (IsBookingPanelOpen && DoctorCards.Count == 0)
            {
                await LoadDoctorsForBooking();
            }
        }

        private async Task LoadDoctorsForBooking()
        {
            try
            {
                IsLoadingDoctors = true;
                var response = await _api.GetAsync<ApiEnvelope<List<SpecializationDoctors>>>(APILibrary.Patient.SpecializationsDoctors);
                _specializationGroups = response?.Data ?? new List<SpecializationDoctors>();

                SpecializationNames = new List<string> { "All" }
                    .Concat(_specializationGroups.Select(s => s.SpecializationName))
                    .ToList();

                ApplySpecializationFilter();
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load doctors for booking: {ex}");
                DoctorCards = new List<DoctorCard>();
            }
            finally
            {
                IsLoadingDoctors = false;
            }
        }

        partial void OnSelectedSpecializationNameChanged(string value) => ApplySpecializationFilter();

        private void ApplySpecializationFilter()
        {
            DoctorCards = SelectedSpecializationName == "All"
                ? _specializationGroups.SelectMany(s => s.Doctors).ToList()
                : _specializationGroups
                    .Where(s => s.SpecializationName == SelectedSpecializationName)
                    .SelectMany(s => s.Doctors)
                    .ToList();
        }

        // Tapping a doctor card adds/removes it from the ranked preference list (max 3);
        // tapping a preference chip removes it the same way.
        [RelayCommand]
        private async Task TogglePreferredDoctor(DoctorCard doctor)
        {
            if (doctor == null)
                return;

            var existing = PreferredDoctors.FirstOrDefault(d => d.DoctorId == doctor.DoctorId);
            if (existing != null)
            {
                PreferredDoctors.Remove(existing);
                if (ActivePreference?.DoctorId == existing.DoctorId)
                {
                    ActivePreference = PreferredDoctors.FirstOrDefault();
                    AvailableSlots = new List<PatientSlot>();
                    SelectedSlot = null;
                    if (ActivePreference != null)
                        await LoadSlotsForActivePreference();
                }
                return;
            }

            if (PreferredDoctors.Count >= 3)
            {
                if (Shell.Current.CurrentPage is ContentPage page)
                {
                    await LiquidGlassAlert.ShowAsync(
                        page,
                        "Maximum reached",
                        "You can pick up to 3 preferred doctors.",
                        "OK");
                }
                return;
            }

            PreferredDoctors.Add(doctor);

            if (ActivePreference == null)
            {
                ActivePreference = doctor;
                await LoadSlotsForActivePreference();
            }
        }

        [RelayCommand]
        private async Task SwitchActivePreference(DoctorCard doctor)
        {
            if (doctor == null || doctor.DoctorId == ActivePreference?.DoctorId)
                return;

            ActivePreference = doctor;
            await LoadSlotsForActivePreference();
        }

        partial void OnSelectedBookingDateChanged(DateTime value)
        {
            if (ActivePreference != null)
            {
                _ = LoadSlotsForActivePreference();
            }
        }

        private async Task LoadSlotsForActivePreference()
        {
            if (ActivePreference?.DoctorId == null)
                return;

            try
            {
                IsLoadingSlots = true;
                SelectedSlot = null;

                var dateParam = SelectedBookingDate.ToString("yyyy-MM-dd");
                var response = await _api.GetAsync<ApiEnvelope<List<PatientSlot>>>(
                    APILibrary.Patient.DoctorSlots(ActivePreference.DoctorId, dateParam));
                AvailableSlots = response?.Data ?? new List<PatientSlot>();

                if (!AvailableSlots.Any(s => s.IsAvailable))
                {
                    await TryNextPreference();
                }
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to load slots for {ActivePreference?.DoctorId}: {ex}");
                AvailableSlots = new List<PatientSlot>();
            }
            finally
            {
                IsLoadingSlots = false;
            }
        }

        // Nudges the patient toward their next preference rather than silently rebooking
        // them with someone else.
        private async Task TryNextPreference()
        {
            if (ActivePreference == null)
                return;

            var currentIndex = PreferredDoctors.IndexOf(ActivePreference);
            var nextIndex = currentIndex + 1;

            if (nextIndex >= PreferredDoctors.Count)
            {
                if (Shell.Current.CurrentPage is ContentPage exhaustedPage)
                {
                    await LiquidGlassAlert.ShowAsync(
                        exhaustedPage,
                        "No free slots",
                        "None of your preferred doctors have a free slot on this date. Try a different date or add another doctor.",
                        "OK");
                }
                return;
            }

            var current = ActivePreference;
            var next = PreferredDoctors[nextIndex];

            if (Shell.Current.CurrentPage is ContentPage page)
            {
                await LiquidGlassAlert.ShowAsync(
                    page,
                    $"{current.Name} has no free slots",
                    $"Switching to your next preference, {next.Name}.",
                    "OK");
            }

            ActivePreference = next;
            await LoadSlotsForActivePreference();
        }

        [RelayCommand]
        private void SelectSlot(PatientSlot slot)
        {
            if (slot == null || !slot.IsAvailable)
                return;

            SelectedSlot = slot;
        }

        [RelayCommand]
        private async Task SubmitBookingRequest()
        {
            if (Shell.Current.CurrentPage is not ContentPage page)
                return;

            if (ActivePreference?.DoctorId == null || SelectedSlot == null)
            {
                await LiquidGlassAlert.ShowAsync(page, "Pick a slot", "Select an available time slot before requesting.", "OK");
                return;
            }

            try
            {
                IsBookingSubmitting = true;

                var payload = new
                {
                    doctorId = ActivePreference.DoctorId,
                    appointmentDate = SelectedSlot.Start,
                    notes = BookingNotes,
                };

                var result = await _api.PostForResultAsync<BookingResult>(APILibrary.Patient.Appointments, payload);

                if (result == null)
                {
                    await LiquidGlassAlert.ShowAsync(page, "Something went wrong", "Please check your connection and try again.", "OK");
                    return;
                }

                if (!result.Status)
                {
                    await LiquidGlassAlert.ShowAsync(page, "Unable to request this slot", result.Message ?? "Please choose another slot.", "OK");
                    await LoadSlotsForActivePreference();
                    return;
                }

                await LiquidGlassAlert.ShowAsync(page, "Request sent", result.Message ?? "The clinic will confirm shortly.", "Great");

                IsBookingPanelOpen = false;
                PreferredDoctors.Clear();
                ActivePreference = null;
                AvailableSlots = new List<PatientSlot>();
                SelectedSlot = null;
                BookingNotes = string.Empty;
                await LoadAppointments();
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to submit appointment request: {ex}");
                await LiquidGlassAlert.ShowAsync(page, "Something went wrong", "Please check your connection and try again.", "OK");
            }
            finally
            {
                IsBookingSubmitting = false;
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
