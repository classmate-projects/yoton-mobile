using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Models;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public class PrescriptionItem
    {
        public required string DrugName { get; set; }
        public required string Dosage { get; set; }
        public required string Frequency { get; set; }
        public required string Instructions { get; set; }
        public required string DoctorName { get; set; }
        public required string RefillsLeft { get; set; }
    }

    public class LabResultItem
    {
        public required string TestName { get; set; }
        public required string Date { get; set; }
        public required string DoctorName { get; set; }
        public required string Status { get; set; }
        public required string ResultSummary { get; set; }
        public string? ResultFilePath { get; set; }
        public bool HasResultFile => !string.IsNullOrEmpty(ResultFilePath);
    }

    public class BillItemDisplay
    {
        public required string BillId { get; set; }
        public required string DateLabel { get; set; }
        public required string NetAmountLabel { get; set; }
        public required string Status { get; set; }
        public required string SummaryLine { get; set; }
    }

    public partial class RecordsViewModel : BaseViewModel
    {
        private readonly ApiService _api;

        [ObservableProperty]
        List<PrescriptionItem> activePrescriptions = new();

        [ObservableProperty]
        List<LabResultItem> labResults = new();

        [ObservableProperty]
        List<BillItemDisplay> bills = new();

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

            try
            {
                var billsResponse = await _api.GetAsync<ApiEnvelope<List<MyBill>>>(APILibrary.Patient.Bills);
                var myBills = billsResponse?.Data ?? new List<MyBill>();

                Bills = myBills
                    .OrderByDescending(b => b.CreatedAt)
                    .Select(ToBillItemDisplay)
                    .ToList();
            }
            catch (Exception)
            {
                Bills = new List<BillItemDisplay>();
            }
        }

        [RelayCommand]
        private async Task ViewReport(LabResultItem item)
        {
            var url = BackendAsset.Url(item?.ResultFilePath);
            if (url == null) return;

            try
            {
                await Browser.Default.OpenAsync(url, BrowserLaunchMode.SystemPreferred);
            }
            catch (Exception ex)
            {
                LogService.Write($"Failed to open report: {ex}");
            }
        }

        private static PrescriptionItem ToPrescriptionItem(MyMedication m) => new()
        {
            DrugName = m.Dosage != null ? $"{m.DrugName} {m.Dosage}" : m.DrugName,
            Dosage = m.Dosage ?? "As directed",
            Frequency = m.Frequency ?? "As directed",
            Instructions = m.Instructions ?? (m.Route != null ? $"Route: {m.Route}" : "No special instructions"),
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
            ResultSummary = DescribeResult(t),
            ResultFilePath = t.ResultFilePath
        };

        private static BillItemDisplay ToBillItemDisplay(MyBill b) => new()
        {
            BillId = b.BillId ?? string.Empty,
            DateLabel = b.CreatedAt.ToString("MMMM d, yyyy"),
            NetAmountLabel = $"{Preferences.Get("currency_symbol", "₹")}{b.NetAmount:0.00}",
            Status = b.Status,
            SummaryLine = b.Items.Count > 0
                ? string.Join(", ", b.Items.Select(i => i.Description).Take(3))
                : "No itemized charges yet"
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
