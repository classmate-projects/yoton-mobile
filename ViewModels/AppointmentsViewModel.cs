using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.ViewModels
{
    public class AppointmentItem
    {
        public string DoctorName { get; set; }
        public string Specialty { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public string Status { get; set; }
        public string Location { get; set; }
    }

    public partial class AppointmentsViewModel : BaseViewModel
    {
        [ObservableProperty]
        List<AppointmentItem> upcomingAppointments;

        [ObservableProperty]
        List<AppointmentItem> pastAppointments;

        public AppointmentsViewModel()
        {
            Title = "Appointments";
            LoadAppointments();
        }

        private void LoadAppointments()
        {
            UpcomingAppointments = new List<AppointmentItem>
            {
                new AppointmentItem
                {
                    DoctorName = "Dr. Sarah Jenkins",
                    Specialty = "Cardiology Specialist",
                    Date = "Monday, July 20",
                    Time = "10:30 AM",
                    Status = "Confirmed",
                    Location = "Building B, Suite 402"
                },
                new AppointmentItem
                {
                    DoctorName = "Dr. Michael Chen",
                    Specialty = "Primary Care Physician",
                    Date = "Wednesday, August 5",
                    Time = "2:15 PM",
                    Status = "Pending",
                    Location = "Building A, Room 120"
                }
            };

            PastAppointments = new List<AppointmentItem>
            {
                new AppointmentItem
                {
                    DoctorName = "Dr. Emily Taylor",
                    Specialty = "Dermatologist",
                    Date = "June 14, 2026",
                    Time = "9:00 AM",
                    Status = "Completed",
                    Location = "Building C, Suite 101"
                },
                new AppointmentItem
                {
                    DoctorName = "Dr. Sarah Jenkins",
                    Specialty = "Cardiology Specialist",
                    Date = "May 2, 2026",
                    Time = "11:00 AM",
                    Status = "Completed",
                    Location = "Building B, Suite 402"
                }
            };
        }

        [RelayCommand]
        private async Task ScheduleNewAppointment()
        {
            await Shell.Current.DisplayAlert("Book Visit", "Appointment scheduling integration is coming soon!", "OK");
        }
    }
}
