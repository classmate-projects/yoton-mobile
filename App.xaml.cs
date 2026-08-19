using Yoton_Mobile.Helper;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;

namespace Yoton_Mobile
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();

            AppDomain.CurrentDomain.FirstChanceException += (s, e) =>
            {
                LogService.Write("⚠️ FirstChanceException: " + e.Exception.Message);
            };
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            return new Window(new NavigationPage(ServiceHelper.GetService<SplashPage>()));
        }

        // Records when the app was last backgrounded so OnResume can tell whether it's
        // been away longer than the company's configured idle timeout (mirrors the web
        // app's useIdleLogout - same setting, same admin-configured minutes, just enforced
        // on resume-from-background instead of a foreground inactivity timer, since MAUI
        // has no cheap app-wide "any touch happened" hook the way a browser does).
        protected override void OnSleep()
        {
            Preferences.Set("app_backgrounded_at_ticks", DateTime.UtcNow.Ticks);
        }

        protected override async void OnResume()
        {
            var backgroundedAtTicks = Preferences.Get("app_backgrounded_at_ticks", 0L);
            if (backgroundedAtTicks == 0)
                return;

            var backgroundedAt = new DateTime(backgroundedAtTicks, DateTimeKind.Utc);
            var idleTimeoutMinutes = Preferences.Get("idle_timeout_minutes", 15);
            if (DateTime.UtcNow - backgroundedAt < TimeSpan.FromMinutes(idleTimeoutMinutes))
                return;

            var token = await SecureStorage.Default.GetAsync("auth_token");
            if (string.IsNullOrEmpty(token))
                return; // Not signed in - nothing to time out.

            if (Preferences.Get("biometric_enabled", false))
            {
                // Quick re-auth, same screen a returning biometric user sees on cold start
                // (SplashPage) - the session itself is still intact, just locked.
                Windows[0].Page = new NavigationPage(ServiceHelper.GetService<BiometricLockPage>());
            }
            else
            {
                // No lighter-weight re-auth available - the session is stale, so require a
                // full login rather than leaving a dangling authenticated screen behind.
                SecureStorage.Default.RemoveAll();
                Preferences.Clear();
                Windows[0].Page = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
            }
        }
    }
}
