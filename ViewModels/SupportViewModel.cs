using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
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
        // Personal emergency/care-circle contacts are patient-entered data with no backing
        // API yet, so this starts empty rather than showing another patient's fixture data.
        [ObservableProperty]
        List<ContactItem> careCircle = new();

        [ObservableProperty]
        string clinicName = "Yoton Clinic Center";

        [ObservableProperty]
        string clinicPhone = "+1 (800) 555-0199";

        [ObservableProperty]
        string clinicAddress = "100 Medical Plaza, Suite A, New York, NY 10001";

        public SupportViewModel()
        {
            Title = "Support & Care Circle";
        }

        [RelayCommand]
        private async Task CallContact(ContactItem contact)
        {
            if (contact?.Phone == null)
                return;

            await CallNumber(contact.Phone);
        }

        [RelayCommand]
        private async Task CallClinic()
        {
            await CallNumber(ClinicPhone);
        }

        private static async Task CallNumber(string phoneNumber)
        {
            try
            {
                PhoneDialer.Open(phoneNumber);
            }
            catch (Exception)
            {
                // No dialer available on this device (e.g. desktop/emulator without telephony) — ignore.
            }
            await Task.CompletedTask;
        }
    }
}
