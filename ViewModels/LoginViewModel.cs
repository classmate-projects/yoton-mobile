using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plugin.Maui.Biometric;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Controls;
using Yoton_Mobile.Services;

namespace Yoton_Mobile.ViewModels
{
    public partial class LoginViewModel : BaseViewModel
    {
        private readonly AuthService _auth;
        private readonly IBiometric _biometric;

        [ObservableProperty]
        string email;

        [ObservableProperty]
        string password;

        public LoginViewModel(AuthService auth, IBiometric biometric)
        {
            _auth = auth;
            _biometric = biometric;
            Title = "Login";
        }

        [RelayCommand]
        public async Task LoginAsync()
        {
            if (IsBusy)
                return;

            IsBusy = true;
            try
            {
                var token = await _auth.LoginAsync(Email, Password);

                if (token == null)
                {
                    await Shell.Current.DisplayAlert("Error", "Invalid login", "OK");
                    return;
                }

                if (!string.Equals(token.Role, "patient", StringComparison.OrdinalIgnoreCase))
                {
                    // AuthService already saved the token optimistically before we knew the
                    // role — discard it so a non-patient session never lingers on this device.
                    Preferences.Clear();
                    SecureStorage.Default.RemoveAll();
                    await Shell.Current.DisplayAlert(
                        "Access restricted",
                        "This app is only available to patients registered with Yoton Clinic.",
                        "OK");
                    return;
                }

                Preferences.Set("user_name", token.Name);
                Preferences.Set("user_role", token.Role);

                await OfferBiometricEnrollmentAsync();

                Application.Current.MainPage = new AppShell();
            }
            finally
            {
                IsBusy = false;
            }
        }

        // Ask once, on the very first successful login, whether the user wants to unlock
        // the app with Face ID / fingerprint next time instead of retyping their password.
        private async Task OfferBiometricEnrollmentAsync()
        {
            if (Preferences.Get("biometric_prompted", false))
                return;

            Preferences.Set("biometric_prompted", true);

            if (!_biometric.IsPlatformSupported)
                return;

            try
            {
                var status = await _biometric.GetAuthenticationStatusAsync(AuthenticatorStrength.Weak);
                if (status != BiometricHwStatus.Success)
                    return;
            }
            catch (Exception)
            {
                return;
            }

            if (Application.Current?.MainPage is NavigationPage navPage && navPage.CurrentPage is ContentPage currentPage)
            {
                var accepted = await LiquidGlassAlert.ShowAsync(
                    currentPage,
                    "Enable Face ID / fingerprint sign-in?",
                    "Unlock Yoton Health next time with your device's biometrics instead of typing your password.",
                    "Enable",
                    "Not now");

                Preferences.Set("biometric_enabled", accepted);
            }
        }
    }

}
