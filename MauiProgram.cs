using CommunityToolkit.Maui;
using Plugin.Maui.Biometric;
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
                .UseMauiCommunityToolkit()
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
            // builder.ConfigureSampleBrowserBase();

#if ANDROID
            // Entry draws its own underline via the native EditText background on Android;
            // our custom Border-wrapped entries (LoginPage, etc.) already provide the outline, so strip it.
            Microsoft.Maui.Handlers.EntryHandler.Mapper.AppendToMapping("NoUnderline", (handler, view) =>
            {
                handler.PlatformView.BackgroundTintList =
                    Android.Content.Res.ColorStateList.ValueOf(Android.Graphics.Color.Transparent);
            });
#endif

            // HttpClient for API calls. AuthRefreshHandler transparently retries a 401 once
            // with a freshly refreshed access token (see its own comments) - "YotonApiRaw" is
            // the same base client without that handler, used only by AuthRefreshHandler
            // itself to call the refresh endpoint without looping back through itself.
            builder.Services.AddTransient<AuthRefreshHandler>();

            builder.Services.AddHttpClient("YotonApi", client =>
            {
                client.BaseAddress = new Uri(APILibrary.BaseUrl);
            }).AddHttpMessageHandler<AuthRefreshHandler>();

            builder.Services.AddHttpClient("YotonApiRaw", client =>
            {
                client.BaseAddress = new Uri(APILibrary.BaseUrl);
            });

            // Services
            builder.Services.AddSingleton<ApiService>();
            builder.Services.AddSingleton<NavigationService>();
            builder.Services.AddSingleton<AuthService>();
            builder.Services.AddSingleton<ChatRealtimeService>();
            builder.Services.AddSingleton(_ => BiometricAuthenticationService.Default);

            // Pages
            builder.Services.AddTransient<SplashPage>();
            builder.Services.AddTransient<WelcomePage>();
            builder.Services.AddTransient<LoginPage>();
            builder.Services.AddTransient<HomePage>();
            builder.Services.AddTransient<AppointmentsPage>();
            builder.Services.AddTransient<RecordsPage>();
            builder.Services.AddTransient<MessagesPage>();
            builder.Services.AddTransient<ChatThreadPage>();
            builder.Services.AddTransient<MorePage>();
            builder.Services.AddTransient<PatientPerspectivePage>();
            builder.Services.AddTransient<SupportPage>();
            builder.Services.AddTransient<SettingsPage>();
            builder.Services.AddTransient<BiometricLockPage>();

            // ViewModels
            builder.Services.AddTransient<WelcomeViewModel>();
            builder.Services.AddTransient<LoginViewModel>();
            builder.Services.AddTransient<HomeViewModel>();
            builder.Services.AddTransient<AppointmentsViewModel>();
            builder.Services.AddTransient<RecordsViewModel>();
            builder.Services.AddTransient<MessagesViewModel>();
            builder.Services.AddTransient<ChatThreadViewModel>();
            builder.Services.AddTransient<MoreViewModel>();
            builder.Services.AddTransient<PatientPerspectiveViewModel>();
            builder.Services.AddTransient<SupportViewModel>();
            builder.Services.AddTransient<SettingsViewModel>();
            builder.Services.AddTransient<BiometricLockViewModel>();

            //Logging
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                LogService.Write("🔥 UNHANDLED EXCEPTION");
                LogService.Write(e.ExceptionObject.ToString() ?? "Unknown exception");
            };

            TaskScheduler.UnobservedTaskException += (s, e) =>
            {
                LogService.Write("🔥 UNOBSERVED TASK EXCEPTION");
                LogService.Write(e.Exception.ToString());
                e.SetObserved();
            };

#if DEBUG
            //builder.Logging.AddDebug(); // debug logs
#endif

            return builder.Build(); // build the app
        }
    }
}
