namespace Yoton_Mobile.BaseLibrary
{
    public static class APILibrary
    {
#if DEBUG
        // Development (Android Emulator)
        public const string BaseUrl = "http://10.0.2.2:5205";
        public const string WebAppUrl = "http://10.0.2.2:3000";
#else
        // Production Server
        public const string BaseUrl = "https://yoton-api.onrender.com";
        public const string WebAppUrl = "https://yoton.netlify.app";
#endif

        public static class Auth
        {
            public const string Login = "/api/auth/login";
        }

        // Patient self-service endpoints. Every route is scoped server-side to the
        // logged-in patient's own JWT identity — no patientId is ever passed by the client.
        public static class Patient
        {
            public const string Me = "/api/patient/me";
            public const string Appointments = "/api/patient/appointments";
            public const string TestResults = "/api/patient/test-results";
            public const string Prescriptions = "/api/patient/prescriptions";
            public const string Consultations = "/api/patient/consultations";
            public const string SpecializationsDoctors = "/api/patient/specializations-doctors";

            public static string DoctorSlots(string doctorId, string date) =>
                $"/api/patient/doctor-slots/{doctorId}?date={date}";
        }
    }
}
