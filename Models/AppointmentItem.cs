namespace Yoton_Mobile.Models
{
    // Shared display model for an appointment card, used by both the Appointments
    // list/booking page and the Home dashboard carousel.
    public class AppointmentItem
    {
        public string? AppointmentId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string Specialty { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}
