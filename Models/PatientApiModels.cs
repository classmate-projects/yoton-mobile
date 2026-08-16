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
        public string? ResultFilePath { get; set; }
    }

    public class MyMedication
    {
        public string? MedicationId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public string? Route { get; set; }
        public string? Instructions { get; set; }
        public int? DurationDays { get; set; }
        public string Status { get; set; } = string.Empty; // Active | Discontinued
        public string? DoctorName { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }

    // View-only — no payment initiation, there is no payment gateway anywhere in this app.
    public class MyBillItem
    {
        public string? Description { get; set; }
        public decimal Amount { get; set; }
    }

    public class MyBill
    {
        public string? BillId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal NetAmount { get; set; }
        public string Status { get; set; } = string.Empty; // Pending, Paid, Cancelled
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<MyBillItem> Items { get; set; } = new();
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

    // ---------------- SELF-SERVICE BOOKING ----------------

    public class SpecializationDoctors
    {
        public string? SpecializationId { get; set; }
        public string SpecializationName { get; set; } = string.Empty;
        public List<DoctorCard> Doctors { get; set; } = new();
    }

    public class DoctorCard
    {
        public string? DoctorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? SpecializationId { get; set; }
        public string? SpecializationName { get; set; }
        public int ExperienceYears { get; set; }
        public decimal ConsultationFee { get; set; }
    }

    // PII-free by design — a patient may see THAT a slot is shared (BookedCount/MaxCapacity)
    // but never WHO else is booked into it. See Yoton_API.Controllers.PatientController.
    public class PatientSlot
    {
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
        public bool IsAvailable { get; set; }
        public bool IsPast { get; set; }
        public int BookedCount { get; set; }
        public int MaxCapacity { get; set; } = 1;
    }

    public class BookingResult
    {
        public bool Status { get; set; }
        public string? Message { get; set; }
        public MyAppointment? Data { get; set; }
    }
}
