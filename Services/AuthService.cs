using System.Net.Http.Json;

namespace Yoton_Mobile.Services
{
    public class AuthService
    {
        private readonly HttpClient _http;

        public AuthService(IHttpClientFactory httpClientFactory)
        {
            _http = httpClientFactory.CreateClient("YotoonApi");
        }
        
        public async Task<string?> LoginAsync(string EmailOrUserName, string password)
        {
            var data = new
            {
                EmailOrUserName,
                password
            };

            var response = await _http.PostAsJsonAsync("/api/auth/login", data);

            if (!response.IsSuccessStatusCode)
                return null;

            var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
            return result?.Token;
        }
    }

    public class LoginResponse
    {
        public string Token { get; set; }
    }

}
