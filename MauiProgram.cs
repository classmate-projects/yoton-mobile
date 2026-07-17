using Microsoft.Extensions.Logging;
using SampleBrowser.Maui.Base.Hosting;
using Yoton_Mobile.BaseLibrary;
using Yoton_Mobile.Pages;
using Yoton_Mobile.Services;
using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();

            builder
                .UseMauiApp<App>() // start the app
                .ConfigureFonts(fonts =>
                {
                    // Public Sans
                    fonts.AddFont("PublicSans-Regular.ttf", "PublicSansRegular");
                    fonts.AddFont("PublicSans-Bold.ttf", "PublicSansBold");
                    fonts.AddFont("PublicSans-Light.ttf", "PublicSansLight");

                    // Noto Sans
                    fonts.AddFont("NotoSans-Regular.ttf", "NotoSansRegular");
                    fonts.AddFont("NotoSans-Bold.ttf", "NotoSansBold");
                    fonts.AddFont("NotoSans-Light.ttf", "NotoSansLight");

                    // Open Sans
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Bold.ttf", "OpenSansBold");
                    fonts.AddFont("OpenSans-Light.ttf", "OpenSansLight");
                });
            builder.ConfigureSampleBrowserBase();

            // HttpClient for API calls
            builder.Services.AddHttpClient("YotonApi", client =>
            {
                client.BaseAddress = new Uri(APILibrary.BaseUrl);
            });

            // Services
            builder.Services.AddSingleton<ApiService>();
            builder.Services.AddSingleton<NavigationService>();
            builder.Services.AddSingleton<AuthService>();

            // Pages
            builder.Services.AddTransient<WelcomePage>();
            builder.Services.AddTransient<LoginPage>();
            builder.Services.AddTransient<HomePage>();
            builder.Services.AddTransient<SplashPage>();
            builder.Services.AddTransient<AppointmentsPage>();
            builder.Services.AddTransient<RecordsPage>();
            builder.Services.AddTransient<MessagesPage>();
            builder.Services.AddTransient<PatientPerspectivePage>();
            builder.Services.AddTransient<SupportPage>();
            builder.Services.AddTransient<SettingsPage>();

            // ViewModels
            builder.Services.AddTransient<WelcomeViewModel>();
            builder.Services.AddTransient<LoginViewModel>();
            builder.Services.AddTransient<HomeViewModel>();
            builder.Services.AddTransient<AppointmentsViewModel>();
            builder.Services.AddTransient<RecordsViewModel>();
            builder.Services.AddTransient<MessagesViewModel>();
            builder.Services.AddTransient<PatientPerspectiveViewModel>();
            builder.Services.AddTransient<SupportViewModel>();
            builder.Services.AddTransient<SettingsViewModel>();

            //Logging
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                LogService.Write("🔥 UNHANDLED EXCEPTION");
                LogService.Write(e.ExceptionObject.ToString());
            };

            TaskScheduler.UnobservedTaskException += (s, e) =>
            {
                LogService.Write("🔥 UNOBSERVED TASK EXCEPTION");
                LogService.Write(e.Exception.ToString());
                e.SetObserved();
            };

#if DEBUG
            builder.Logging.AddDebug(); // debug logs
#endif

            return builder.Build(); // build the app
        }
    }
}
