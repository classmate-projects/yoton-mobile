namespace Yoton_Mobile.Models
{
    public class Patient
    {
        public int OpId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string DateOfBirth { get; set; }
    }

    public class PatientResponse
    {
        public string Message { get; set; }
        public List<Patient> Patients { get; set; }
    }

}
