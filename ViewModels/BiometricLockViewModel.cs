using System.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plugin.Maui.Biometric;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;

namespace Yoton_Mobile.ViewModels
{
    public partial class BiometricLockViewModel : BaseViewModel
    {
        // After this many failed biometric attempts in a single app-open, stop retrying
        // biometrics and drop the user back to username/password sign-in.
        private const int MaxFailedAttempts = 3;

        private readonly IBiometric _biometric;
        private int _failedAttempts;

        public string UserName => Preferences.Get("user_name", "Patient User");

        [ObservableProperty]
        string statusMessage = "Use Face ID or your fingerprint to continue";

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(CanUnlock))]
        bool isAuthenticating;

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(CanUnlock))]
        bool isLockedOut;

        public bool CanUnlock => !IsAuthenticating && !IsLockedOut;

        public BiometricLockViewModel(IBiometric biometric)
        {
            _biometric = biometric;
            Title = "Unlock";
        }

        [RelayCommand]
        public async Task Unlock()
        {
            if (IsAuthenticating || IsLockedOut)
                return;

            IsAuthenticating = true;
            StatusMessage = "Verifying...";
            try
            {
                var request = new AuthenticationRequest
                {
                    Title = "Unlock Yoton Health",
                    Subtitle = "Verify it's you",
                    Description = "Use your fingerprint or face to continue",
                    NegativeText = "Cancel",
                    AllowPasswordAuth = false,
                    AuthStrength = AuthenticatorStrength.Weak
                };

                var response = await _biometric.AuthenticateAsync(request, CancellationToken.None);

                if (response.Status == BiometricResponseStatus.Success)
                {
                    _failedAttempts = 0;
                    Application.Current!.Windows[0].Page = new AppShell();
                    return;
                }

                await RegisterFailedAttemptAsync(response.ErrorMsg);
            }
            catch (Exception)
            {
                await RegisterFailedAttemptAsync(null);
            }
            finally
            {
                IsAuthenticating = false;
            }
        }

        private async Task RegisterFailedAttemptAsync(string? errorMsg)
        {
            _failedAttempts++;
            var remaining = MaxFailedAttempts - _failedAttempts;

            if (remaining <= 0)
            {
                IsLockedOut = true;
                StatusMessage = "Too many failed attempts. Please sign in with your username and password.";
                await Task.Delay(1400);
                UsePasswordInstead();
                return;
            }

            var reason = string.IsNullOrWhiteSpace(errorMsg) ? "Couldn't verify" : errorMsg;
            StatusMessage = $"{reason} — {remaining} attempt{(remaining == 1 ? "" : "s")} remaining.";
        }

        [RelayCommand]
        private void UsePasswordInstead()
        {
            Application.Current!.Windows[0].Page = new NavigationPage(ServiceHelper.GetService<LoginPage>());
        }
    }
}
