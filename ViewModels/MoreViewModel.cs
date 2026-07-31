using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Pages;

namespace Yoton_Mobile.ViewModels
{
    // Hub page for the 5th "More" tab — replaces the old flyout menu so Settings,
    // Support, and Patient Perspective are reachable (and leavable, via Shell's
    // native back button) from the same persistent tab bar as everything else.
    public partial class MoreViewModel : BaseViewModel
    {
        [ObservableProperty]
        string userName = Preferences.Get("user_name", "Patient User");

        [ObservableProperty]
        string userRole = Preferences.Get("user_role", "Patient");

        [ObservableProperty]
        string userInitials = AppShell.ComputeInitials(Preferences.Get("user_name", "Patient User"));

        public MoreViewModel()
        {
            Title = "More";
        }

        public void RefreshProfile()
        {
            UserName = Preferences.Get("user_name", "Patient User");
            UserRole = Preferences.Get("user_role", "Patient");
            UserInitials = AppShell.ComputeInitials(UserName);
        }

        [RelayCommand]
        private Task GoToPatientPerspective() => Shell.Current.GoToAsync(nameof(PatientPerspectivePage));

        [RelayCommand]
        private Task GoToSupport() => Shell.Current.GoToAsync(nameof(SupportPage));

        [RelayCommand]
        private Task GoToSettings() => Shell.Current.GoToAsync(nameof(SettingsPage));
    }
}
