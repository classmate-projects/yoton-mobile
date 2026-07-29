using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;

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
        private readonly ApiService _api;

        [ObservableProperty]
        List<PrescriptionItem> activePrescriptions = new();

        [ObservableProperty]
        List<LabResultItem> labResults = new();

        public RecordsViewModel(ApiService api)
        {
            _api = api;
            Title = "Medical Records";
        }

        public async Task InitializeAsync()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                await LoadRecords();
            }
            finally
            {
                IsBusy = false;
            }
        }

        private async Task LoadRecords()
        {
            try
            {
                var prescriptionsResponse = await _api.GetAsync<ApiEnvelope<List<MyMedication>>>(APILibrary.Patient.Prescriptions);
                var medications = prescriptionsResponse?.Data ?? new List<MyMedication>();

                ActivePrescriptions = medications
                    .Where(m => m.Status == "Active")
                    .OrderByDescending(m => m.StartedAt)
                    .Select(ToPrescriptionItem)
                    .ToList();
            }
            catch (Exception)
            {
                ActivePrescriptions = new List<PrescriptionItem>();
            }

            try
            {
                var testResultsResponse = await _api.GetAsync<ApiEnvelope<List<MyTestResult>>>(APILibrary.Patient.TestResults);
                var testResults = testResultsResponse?.Data ?? new List<MyTestResult>();

                LabResults = testResults
                    .OrderByDescending(t => t.RequestedDate)
                    .Select(ToLabResultItem)
                    .ToList();
            }
            catch (Exception)
            {
                LabResults = new List<LabResultItem>();
            }
        }

        private static PrescriptionItem ToPrescriptionItem(MyMedication m) => new()
        {
            DrugName = m.Dosage != null ? $"{m.DrugName} {m.Dosage}" : m.DrugName,
            Dosage = m.Dosage ?? "As directed",
            Frequency = m.Frequency ?? "As directed",
            DoctorName = m.DoctorName ?? "Unassigned",
            RefillsLeft = DescribeDuration(m)
        };

        private static string DescribeDuration(MyMedication m)
        {
            if (!m.DurationDays.HasValue)
                return "Ongoing";

            var remaining = m.DurationDays.Value - (DateTime.UtcNow - m.StartedAt).Days;
            return remaining > 0 ? $"{remaining} day(s) remaining" : "Course complete";
        }

        private static LabResultItem ToLabResultItem(MyTestResult t) => new()
        {
            TestName = t.TestName,
            Date = (t.CompletedDate ?? t.RequestedDate).ToString("MMMM d, yyyy"),
            DoctorName = t.DoctorName ?? "Unassigned",
            Status = t.Status,
            ResultSummary = DescribeResult(t)
        };

        private static string DescribeResult(MyTestResult t)
        {
            if (t.HasResultFile)
                return "Your result is ready. Tap to view the full report.";

            return t.Status switch
            {
                "Requested" => "Awaiting sample collection.",
                "SampleCollected" => "Sample collected, processing has begun.",
                "Processing" => "Your test is being processed by the lab.",
                "Scheduled" => "Your scan has been scheduled.",
                _ => "Awaiting results."
            };
        }
    }
}
