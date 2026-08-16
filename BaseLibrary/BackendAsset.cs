namespace Yoton_Mobile.BaseLibrary
{
    // Mirrors the web app's lib/backendAsset.ts — FileStorageService.SaveFileAsync returns a
    // backend-relative path (e.g. "/Uploads/LabResults/x.pdf"); the API and this app don't
    // share an origin, so it needs APILibrary.BaseUrl prefixed before it's a fetchable URL.
    public static class BackendAsset
    {
        public static string? Url(string? path)
        {
            if (string.IsNullOrEmpty(path)) return null;
            if (path.StartsWith("http://") || path.StartsWith("https://")) return path;
            return $"{APILibrary.BaseUrl}{path}";
        }
    }
}
