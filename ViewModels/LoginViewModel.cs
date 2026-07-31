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

                // Login work is done — drop the busy overlay before showing any alert so the
                // two don't stack visually.
                IsBusy = false;

                // LoginPage lives inside a NavigationPage before login succeeds — Shell.Current
                // is only set once AppShell becomes MainPage, which happens further down after a
                // successful *patient* login. LiquidGlassAlert.ShowAsync just needs the actual
                // ContentPage it should render into, not Shell.Current.
                var currentPage = ((Application.Current?.MainPage as NavigationPage)?.CurrentPage
                    ?? Application.Current?.MainPage) as ContentPage;

                if (token == null)
                {
                    if (currentPage != null)
                        await LiquidGlassAlert.ShowAsync(currentPage, "Error", "Invalid login", "Retry");
                    return;
                }

                if (!string.Equals(token.Role, "patient", StringComparison.OrdinalIgnoreCase))
                {
                    // AuthService already saved the token optimistically before we knew the
                    // role — discard it so a non-patient session never lingers on this device.
                    // Worded for an end user who has no idea what "role" or "Yoton" internals
                    // mean — just: this app is for patients, staff sign in on the web instead.
                    Preferences.Clear();
                    SecureStorage.Default.RemoveAll();
                    if (currentPage != null)
                    {
                        await LiquidGlassAlert.ShowAsync(
                            currentPage,
                            "This app is for patients only",
                            "This account isn't a patient account. Doctors, reception, and other clinic staff should sign in through the Yoton web portal on a computer instead of this app.",
                            "OK");
                    }
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
