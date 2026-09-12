using System.Net;

namespace Yoton_Mobile.BaseLibrary
{
    // Registered on the "YotonApi" HttpClient (see MauiProgram.cs) so every call made
    // through ApiService transparently survives an expired access token. The access token
    // is short-lived by design (Jwt:AccessTokenMinutes on the API) - without this, a 401
    // would previously have meant "you're logged out" every ~30 minutes, since ApiService
    // had no 401 handling at all before refresh tokens existed.
    public class AuthRefreshHandler : DelegatingHandler
    {
        private readonly IHttpClientFactory _factory;

        public AuthRefreshHandler(IHttpClientFactory factory)
        {
            _factory = factory;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = await base.SendAsync(request, cancellationToken);

            if (response.StatusCode != HttpStatusCode.Unauthorized)
                return response;

            var newAccessToken = await TokenRefreshService.RefreshAsync(_factory);
            if (newAccessToken == null)
                return response;

            var retryRequest = await CloneRequestAsync(request);
            retryRequest.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", newAccessToken);

            response.Dispose();
            return await base.SendAsync(retryRequest, cancellationToken);
        }

        private static async Task<HttpRequestMessage> CloneRequestAsync(HttpRequestMessage request)
        {
            var clone = new HttpRequestMessage(request.Method, request.RequestUri);

            if (request.Content != null)
            {
                var bytes = await request.Content.ReadAsByteArrayAsync();
                clone.Content = new ByteArrayContent(bytes);
                foreach (var header in request.Content.Headers)
                    clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            foreach (var header in request.Headers)
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);

            return clone;
        }
    }
}
