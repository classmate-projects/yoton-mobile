using System.Net.Http.Json;
using System.Text.Json;

namespace Yoton_Mobile.BaseLibrary
{
    public class ApiService
    {
        private readonly IHttpClientFactory _factory;

        // The API serializes with ASP.NET Core's default camelCase policy ("role", not "Role"),
        // while every C# model here uses PascalCase. System.Text.Json's default deserialization
        // is case-sensitive, so without this every property on every response model silently
        // came back null (including LoginResponse.Token — the actual root cause of the
        // NullReferenceException on login for every role, not just admin).
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

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
            return await client.GetFromJsonAsync<T>(url, JsonOptions);
        }

        public async Task<T?> PostAsync<T>(string url, object data)
        {
            var client = await CreateClientAsync();
            var response = await client.PostAsJsonAsync(url, data, JsonOptions);

            if (!response.IsSuccessStatusCode)
                return default;

            return await response.Content.ReadFromJsonAsync<T>(JsonOptions);
        }

        // Unlike PostAsync, this always attempts to parse the response body regardless of
        // status code, so business-rule failures (e.g. "slot already booked", HTTP 200 with
        // a false "status" field, or a 400 validation message) reach the caller instead of
        // collapsing into a generic null.
        public async Task<T?> PostForResultAsync<T>(string url, object data)
        {
            var client = await CreateClientAsync();
            var response = await client.PostAsJsonAsync(url, data, JsonOptions);

            try
            {
                return await response.Content.ReadFromJsonAsync<T>(JsonOptions);
            }
            catch (Exception)
            {
                return default;
            }
        }

        // multipart/form-data POST - for endpoints that accept file attachments alongside
        // plain fields (e.g. chat messages with an attached image). fields' keys must match
        // the target [FromForm] request DTO's property names case-insensitively (ASP.NET
        // Core's model binder isn't case-sensitive here, unlike JSON body binding).
        public async Task<T?> PostMultipartAsync<T>(string url, Dictionary<string, string> fields, IEnumerable<(string FieldName, string FileName, Stream Content)>? files = null)
        {
            var client = await CreateClientAsync();
            using var content = new MultipartFormDataContent();

            foreach (var (key, value) in fields)
                content.Add(new StringContent(value ?? string.Empty), key);

            if (files != null)
            {
                foreach (var (fieldName, fileName, stream) in files)
                    content.Add(new StreamContent(stream), fieldName, fileName);
            }

            var response = await client.PostAsync(url, content);

            try
            {
                return await response.Content.ReadFromJsonAsync<T>(JsonOptions);
            }
            catch (Exception)
            {
                return default;
            }
        }
    }
}
