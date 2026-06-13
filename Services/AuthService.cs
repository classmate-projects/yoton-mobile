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

            if (result == null)
                return null;

            // Save token
            Preferences.Set("auth_token", result.Token);

            return result;
        }
    }

    public class LoginResponse
    {
        public int UserId { get; set; }
        public string Name { get; set; }
        public string Role { get; set; }
        public string Token { get; set; }
    }
}
