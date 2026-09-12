using Yoton_Mobile.BaseLibrary;
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

            _ = RunProactiveTokenRefreshLoopAsync();
        }

        // ChatRealtimeService's AccessTokenProvider only reads SecureStorage lazily, at
        // (re)connect time - a healthy SignalR socket never reconnects, so nothing else
        // notices the access token going stale underneath it (Jwt:AccessTokenMinutes on the
        // API - 30 minutes by default). If that socket then drops (network blip, OS
        // suspending the connection) after the token has aged past its lifetime, reconnect
        // hands the server an already-dead token with no way to recover on its own. Running
        // independently of any REST call - and of OnSleep/OnResume, since a foregrounded app
        // with an open chat connection never fires either - keeps the stored token fresh so a
        // reconnect always has something valid to send.
        private static async Task RunProactiveTokenRefreshLoopAsync()
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(20));
            while (await timer.WaitForNextTickAsync())
            {
                var token = await SecureStorage.Default.GetAsync("auth_token");
                if (string.IsNullOrEmpty(token))
                    continue; // Not signed in - nothing to refresh.

                await TokenRefreshService.RefreshAsync(ServiceHelper.GetService<IHttpClientFactory>());
            }
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
                // Mirrors the web app's useIdleLogout: revoke the refresh token server-side
                // (best-effort, not awaited) before wiping local session state, so a device
                // left idle past the timeout can't be resumed just by restoring these bytes.
                var refreshToken = await SecureStorage.Default.GetAsync("refresh_token");
                _ = ServiceHelper.GetService<AuthService>().RevokeRefreshTokenAsync(refreshToken);

                SecureStorage.Default.RemoveAll();
                Preferences.Clear();
                Windows[0].Page = new NavigationPage(ServiceHelper.GetService<WelcomePage>());
            }
        }
    }
}
