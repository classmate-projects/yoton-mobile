using Yoton_Mobile.Pages;

namespace Yoton_Mobile
{
    public partial class AppShell : Shell
    {
        public string UserName => Preferences.Get("user_name", "Patient User");
        public string UserRole => Preferences.Get("user_role", "Patient");
        public string UserInitials => !string.IsNullOrEmpty(UserName) ? UserName[0].ToString().ToUpper() : "P";

        public AppShell()
        {
            InitializeComponent();
            BindingContext = this;

            Routing.RegisterRoute(nameof(WelcomePage), typeof(WelcomePage));
            Routing.RegisterRoute(nameof(LoginPage), typeof(LoginPage));
            Routing.RegisterRoute(nameof(HomePage), typeof(HomePage));
            Routing.RegisterRoute(nameof(AppointmentsPage), typeof(AppointmentsPage));
            Routing.RegisterRoute(nameof(RecordsPage), typeof(RecordsPage));
            Routing.RegisterRoute(nameof(MessagesPage), typeof(MessagesPage));
            Routing.RegisterRoute(nameof(PatientPerspectivePage), typeof(PatientPerspectivePage));
            Routing.RegisterRoute(nameof(SupportPage), typeof(SupportPage));
            Routing.RegisterRoute(nameof(SettingsPage), typeof(SettingsPage));
        }
    }
}
