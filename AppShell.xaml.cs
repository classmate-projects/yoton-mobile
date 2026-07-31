using Yoton_Mobile.Pages;

namespace Yoton_Mobile
{
    public partial class AppShell : Shell
    {
        // First + last name initial (e.g. "John Smith" -> "JS"), falling back gracefully
        // for single-word or empty names. Used by MoreViewModel/SettingsViewModel for
        // their profile headers.
        public static string ComputeInitials(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "P";

            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0)
                return "P";

            var first = parts[0][0].ToString().ToUpper();
            var last = parts.Length > 1 ? parts[^1][0].ToString().ToUpper() : string.Empty;
            return first + last;
        }

        public AppShell()
        {
            InitializeComponent();

            Routing.RegisterRoute(nameof(WelcomePage), typeof(WelcomePage));
            Routing.RegisterRoute(nameof(LoginPage), typeof(LoginPage));
            Routing.RegisterRoute(nameof(HomePage), typeof(HomePage));
            Routing.RegisterRoute(nameof(AppointmentsPage), typeof(AppointmentsPage));
            Routing.RegisterRoute(nameof(RecordsPage), typeof(RecordsPage));
            Routing.RegisterRoute(nameof(MessagesPage), typeof(MessagesPage));
            Routing.RegisterRoute(nameof(MorePage), typeof(MorePage));
            Routing.RegisterRoute(nameof(PatientPerspectivePage), typeof(PatientPerspectivePage));
            Routing.RegisterRoute(nameof(SupportPage), typeof(SupportPage));
            Routing.RegisterRoute(nameof(SettingsPage), typeof(SettingsPage));
        }
    }
}
