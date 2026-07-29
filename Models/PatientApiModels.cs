namespace Yoton_Mobile.Models
{
    // Client-side mirrors of Yoton_API.DTOs.PatientDTO — one per /api/patient/* response.

    public class MyProfile
    {
        public string? OPId { get; set; }
        public string? OPNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Sex { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? ProfileImagePath { get; set; }
    }

    public class MyAppointment
    {
        public string? AppointmentId { get; set; }
        public string? DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string? SpecializationName { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class MyTestResult
    {
        public string? TestResultId { get; set; }
        public string Category { get; set; } = string.Empty; // "Lab" | "Radiology"
        public string TestName { get; set; } = string.Empty;
        public string? Priority { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? DoctorName { get; set; }
        public DateTime RequestedDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public bool HasResultFile { get; set; }
    }

    public class MyMedication
    {
        public string? MedicationId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public int? DurationDays { get; set; }
        public string Status { get; set; } = string.Empty; // Active | Discontinued
        public string? DoctorName { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }

    public class MyConsultation
    {
        public string? EncounterId { get; set; }
        public string? AppointmentId { get; set; }
        public string? DoctorName { get; set; }
        public string? SpecializationName { get; set; }
        public string? ChiefComplaint { get; set; }
        public string? DiagnosisDescription { get; set; }
        public string? PlannedProcedures { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
