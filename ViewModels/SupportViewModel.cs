using CommunityToolkit.Mvvm.ComponentModel;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.ViewModels
{
    public class ContactItem
    {
        public string Name { get; set; }
        public string Role { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
    }

    public partial class SupportViewModel : BaseViewModel
    {
        [ObservableProperty]
        List<ContactItem> careCircle;

        [ObservableProperty]
        string clinicName = "Yoton Clinic Center";

        [ObservableProperty]
        string clinicPhone = "+1 (800) 555-0199";

        [ObservableProperty]
        string clinicAddress = "100 Medical Plaza, Suite A, New York, NY 10001";

        public SupportViewModel()
        {
            Title = "Support & Care Circle";
            LoadCareCircle();
        }

        private void LoadCareCircle()
        {
            CareCircle = new List<ContactItem>
            {
                new ContactItem
                {
                    Name = "Dr. Michael Chen",
                    Role = "Primary Care Physician",
                    Phone = "+1 (555) 012-3456",
                    Email = "m.chen@yotonhealth.com"
                },
                new ContactItem
                {
                    Name = "Sarah Connor (Wife)",
                    Role = "Emergency Contact / Next of Kin",
                    Phone = "+1 (555) 987-6543",
                    Email = "sarah.c@gmail.com"
                },
                new ContactItem
                {
                    Name = "Dr. Sarah Jenkins",
                    Role = "Cardiologist",
                    Phone = "+1 (555) 345-6789",
                    Email = "s.jenkins@yotonhealth.com"
                },
                new ContactItem
                {
                    Name = "Walgreens Pharmacy #1458",
                    Role = "Preferred Pharmacy",
                    Phone = "+1 (555) 765-4321",
                    Email = "rx.1458@walgreens.com"
                }
            };
        }
    }
}
