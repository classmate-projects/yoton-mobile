using System.Net.Http.Json;

namespace Yoton_Mobile.BaseLibrary
{
    public class ApiService
    {
        private readonly IHttpClientFactory _factory;

        public ApiService(IHttpClientFactory factory)
        {
            _factory = factory;
        }

        private async Task<HttpClient> CreateClientAsync()
        {
            var client = _factory.CreateClient("YotonApi");

            var token = await SecureStorage.Default.GetAsync("auth_token");
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        public async Task<T?> GetAsync<T>(string url)
        {
            var client = await CreateClientAsync();
            return await client.GetFromJsonAsync<T>(url);
        }

        public async Task<T?> PostAsync<T>(string url, object data)
        {
            var client = await CreateClientAsync();
            var response = await client.PostAsJsonAsync(url, data);

            if (!response.IsSuccessStatusCode)
                return default;

            return await response.Content.ReadFromJsonAsync<T>();
        }

        // Unlike PostAsync, this always attempts to parse the response body regardless of
        // status code, so business-rule failures (e.g. "slot already booked", HTTP 200 with
        // a false "status" field, or a 400 validation message) reach the caller instead of
        // collapsing into a generic null.
        public async Task<T?> PostForResultAsync<T>(string url, object data)
        {
            var client = await CreateClientAsync();
            var response = await client.PostAsJsonAsync(url, data);

            try
            {
                return await response.Content.ReadFromJsonAsync<T>();
            }
            catch (Exception)
            {
                return default;
            }
        }
    }
}
