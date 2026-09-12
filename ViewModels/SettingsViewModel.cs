using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Helper;
using Yoton_Mobile.Models;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class SettingsViewModel : BaseViewModel
    {
        private readonly ApiService _api;
        private readonly AuthService _auth;

        [ObservableProperty]
        string userName = Preferences.Get("user_name", "Patient User");

        [ObservableProperty]
        string userEmail = "";

        [ObservableProperty]
        string userInitials = AppShell.ComputeInitials(Preferences.Get("user_name", "Patient User"));

        [ObservableProperty]
        bool isDarkModeEnabled;

        [ObservableProperty]
        bool isNotificationsEnabled = true;

        [ObservableProperty]
        bool isBiometricEnabled;

        // Sourced from AppInfo (which reads ApplicationDisplayVersion in the .csproj) rather
        // than a hardcoded literal, so a version bump only ever needs to happen in one place.
        [ObservableProperty]
        string appVersion = AppInfo.Current.VersionString;

        public SettingsViewModel(ApiService api, AuthService auth)
        {
            _api = api;
            _auth = auth;
            Title = "Settings";
            IsDarkModeEnabled = Application.Current!.UserAppTheme == AppTheme.Dark;
            IsBiometricEnabled = Preferences.Get("biometric_enabled", false);
        }

        public async Task InitializeAsync()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                await LoadProfile();
            }
            finally
            {
                IsBusy = false;
            }
        }

        private async Task LoadProfile()
        {
            try
            {
                var response = await _api.GetAsync<ApiEnvelope<MyProfile>>(APILibrary.Patient.Me);

                if (response?.Data != null)
                {
                    if (!string.IsNullOrWhiteSpace(response.Data.Name))
                    {
                        UserName = response.Data.Name;
                        Preferences.Set("user_name", response.Data.Name);
                    }
                    UserEmail = response.Data.Email ?? "";
                }
            }
            catch (Exception)
            {
                // Keep the cached Preferences value when offline.
            }
            finally
            {
                UserInitials = AppShell.ComputeInitials(UserName);
            }
        }

        partial void OnIsDarkModeEnabledChanged(bool value)
        {
            Application.Current!.UserAppTheme = value ? AppTheme.Dark : AppTheme.Light;
        }

        partial void OnIsBiometricEnabledChanged(bool value)
        {
            Preferences.Set("biometric_enabled", value);
        }

        [RelayCommand]
        private async Task Logout()
        {
            // Captured before SecureStorage is cleared below - same shape as the web app's
            // lib/auth.ts logout(). Fired without awaiting: local session state is torn down
            // and navigation happens immediately, the server-side revoke is a best-effort
            // cleanup that must never block it.
            var refreshToken = await SecureStorage.Default.GetAsync("refresh_token");
            _ = _auth.RevokeRefreshTokenAsync(refreshToken);

            Preferences.Clear();
            SecureStorage.Default.RemoveAll();
            var welcomePage = ServiceHelper.GetService<WelcomePage>();
            Application.Current!.Windows[0].Page = new NavigationPage(welcomePage);
        }
    }
}
