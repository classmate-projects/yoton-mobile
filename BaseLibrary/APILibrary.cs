namespace Yoton_Mobile.BaseLibrary
{
    public static class APILibrary
    {
#if DEBUG
        // Development (Android Emulator)
        public const string BaseUrl = "http://10.0.2.2:5205";
#else
        // Production Server
        public const string BaseUrl = "https://yoton-api.onrender.com";
#endif

        public static class Auth
        {
            public const string Login = "/api/auth/login";
        }

        public static class Patient
        {
            public const string GetAllPatients = "/api/reception/patient";
        }
    }
}
