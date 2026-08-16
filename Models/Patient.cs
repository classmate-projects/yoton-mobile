namespace Yoton_Mobile.Models
{
    public class Patient
    {
        public string OpId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;
    }

    public class PatientResponse
    {
        public string Message { get; set; } = string.Empty;
        public List<Patient> Patients { get; set; } = new();
    }

}
