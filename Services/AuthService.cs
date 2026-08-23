using System.Net.Http.Json;
using Yoton_Mobile.BaseLibrary;

namespace Yoton_Mobile.Services
{
    public class AuthService
    {
        private readonly ApiService _api;

        public AuthService(ApiService api)
        {
            _api = api;
        }

        public async Task<LoginResponse?> LoginAsync(string emailOrUserName, string password)
        {
            var data = new
            {
                emailorusername = emailOrUserName,
                password = password
            };

            var result = await _api.PostAsync<LoginResponse>(APILibrary.Auth.Login, data);

            if (result?.Token == null)
                return null;

            // Save token in encrypted, OS-backed storage (Keychain/Keystore) rather than
            // Preferences, which is plaintext and included in Android's default app backups.
            await SecureStorage.Default.SetAsync("auth_token", result.Token);

            // Admin-configurable in the web app's Settings page (CompanyController.UpdateSettings) -
            // stored so RecordsViewModel can render bill amounts without hardcoding a symbol.
            Preferences.Set("currency_symbol", result.CurrencySymbol ?? "₹");

            // Same company-wide setting the web app enforces (useIdleLogout) - read by
            // App.xaml.cs's OnSleep/OnResume to force re-auth after the app has sat
            // backgrounded for longer than this many minutes.
            Preferences.Set("idle_timeout_minutes", result.IdleTimeoutMinutes ?? 15);

            return result;
        }
    }

    public class LoginResponse
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public bool IsDefaultPassword { get; set; }
        public string? CurrencyCode { get; set; }
        public string? CurrencySymbol { get; set; }
        public int? IdleTimeoutMinutes { get; set; }
    }
}
