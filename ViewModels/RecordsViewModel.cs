using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.ViewModels
{
    public class PrescriptionItem
    {
        public string DrugName { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public string DoctorName { get; set; }
        public string RefillsLeft { get; set; }
    }

    public class LabResultItem
    {
        public string TestName { get; set; }
        public string Date { get; set; }
        public string DoctorName { get; set; }
        public string Status { get; set; }
        public string ResultSummary { get; set; }
    }

    public partial class RecordsViewModel : BaseViewModel
    {
        [ObservableProperty]
        List<PrescriptionItem> activePrescriptions;

        [ObservableProperty]
        List<LabResultItem> labResults;

        public RecordsViewModel()
        {
            Title = "Medical Records";
            LoadRecords();
        }

        private void LoadRecords()
        {
            ActivePrescriptions = new List<PrescriptionItem>
            {
                new PrescriptionItem
                {
                    DrugName = "Lisinopril 10mg",
                    Dosage = "1 Tablet",
                    Frequency = "Once daily (Morning)",
                    DoctorName = "Dr. Michael Chen",
                    RefillsLeft = "3 Refills remaining"
                },
                new PrescriptionItem
                {
                    DrugName = "Atorvastatin 20mg",
                    Dosage = "1 Tablet",
                    Frequency = "Once daily (Bedtime)",
                    DoctorName = "Dr. Sarah Jenkins",
                    RefillsLeft = "2 Refills remaining"
                },
                new PrescriptionItem
                {
                    DrugName = "Metformin 500mg",
                    Dosage = "1 Tablet",
                    Frequency = "Twice daily (With meals)",
                    DoctorName = "Dr. Michael Chen",
                    RefillsLeft = "5 Refills remaining"
                }
            };

            LabResults = new List<LabResultItem>
            {
                new LabResultItem
                {
                    TestName = "Comprehensive Metabolic Panel (CMP)",
                    Date = "July 10, 2026",
                    DoctorName = "Dr. Michael Chen",
                    Status = "Reviewed",
                    ResultSummary = "All vitals in normal range. Kidney & liver functions stable."
                },
                new LabResultItem
                {
                    TestName = "Lipid Panel (Cholesterol Test)",
                    Date = "July 10, 2026",
                    DoctorName = "Dr. Sarah Jenkins",
                    Status = "Reviewed",
                    ResultSummary = "LDL decreased by 12% since last test. Continue current dose."
                },
                new LabResultItem
                {
                    TestName = "HbA1c (Blood Sugar Tracker)",
                    Date = "May 15, 2026",
                    DoctorName = "Dr. Michael Chen",
                    Status = "Reviewed",
                    ResultSummary = "HbA1c level: 5.8% (Pre-diabetes management is effective)."
                }
            };
        }
    }
}
