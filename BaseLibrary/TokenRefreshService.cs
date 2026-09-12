using System.Net.Http.Json;
using System.Text.Json;

namespace Yoton_Mobile.BaseLibrary
{
    // Shared by AuthRefreshHandler (reactive - retries a request that just came back 401) and
    // App.xaml.cs's proactive background timer (keeps SecureStorage fresh on its own schedule
    // so ChatRealtimeService's AccessTokenProvider - which only reads SecureStorage lazily, at
    // (re)connect time - never hands a dropped-and-reconnecting SignalR socket a token that
    // already expired while the socket was healthy and nothing was calling the REST API).
    public static class TokenRefreshService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        // A single in-flight refresh is shared across every caller (concurrent 401s, or a
        // 401 racing the proactive timer) - the API only accepts a given refresh token once
        // (rotation - see RefreshTokenService.RotateAsync), so a second concurrent call with
        // the same token would just fail and force a real logout for no reason.
        private static readonly SemaphoreSlim RefreshLock = new(1, 1);

        public static async Task<string?> RefreshAsync(IHttpClientFactory factory)
        {
            await RefreshLock.WaitAsync();
            try
            {
                // Another caller may have already refreshed while this one was waiting on the
                // lock - re-reading what's stored now (rather than trusting a token captured
                // before the wait) means that case reuses it instead of rotating again.
                var refreshToken = await SecureStorage.Default.GetAsync("refresh_token");
                if (string.IsNullOrEmpty(refreshToken))
                    return null;

                // A fresh, handler-less client - going through "YotonApi" would re-enter
                // AuthRefreshHandler and loop if the refresh call itself 401s.
                var client = factory.CreateClient("YotonApiRaw");
                var response = await client.PostAsJsonAsync(APILibrary.Auth.RefreshToken, new { refreshToken }, JsonOptions);

                if (!response.IsSuccessStatusCode)
                {
                    // The refresh token itself is dead (expired/revoked/reused) - clear both
                    // tokens so SplashPage's next cold-start check correctly treats this as
                    // logged out instead of retrying a token that can never work again.
                    SecureStorage.Default.Remove("auth_token");
                    SecureStorage.Default.Remove("refresh_token");
                    return null;
                }

                var result = await response.Content.ReadFromJsonAsync<RefreshResponse>(JsonOptions);
                if (result?.Token == null)
                    return null;

                await SecureStorage.Default.SetAsync("auth_token", result.Token);
                if (!string.IsNullOrEmpty(result.RefreshToken))
                    await SecureStorage.Default.SetAsync("refresh_token", result.RefreshToken);

                return result.Token;
            }
            catch
            {
                // Offline/unreachable - leave the stored tokens alone so a retry once
                // connectivity returns can still succeed instead of forcing a re-login.
                return null;
            }
            finally
            {
                RefreshLock.Release();
            }
        }

        private class RefreshResponse
        {
            public string? Token { get; set; }
            public string? RefreshToken { get; set; }
        }
    }
}
