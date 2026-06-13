using Microsoft.Extensions.Logging;
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
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular"); // font 1
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold"); // font 2
                });

            // HttpClient for API calls
            builder.Services.AddHttpClient("YotonApi", client =>
            {
                client.BaseAddress = new Uri(APILibrary.BaseUrl);
            });

            // Services
            builder.Services.AddSingleton<ApiService>();
            builder.Services.AddSingleton<AuthService>();

            // Pages
            builder.Services.AddSingleton<WelcomePage>();
            builder.Services.AddTransient<LoginPage>();
            builder.Services.AddTransient<HomePage>();

            // ViewModels
            builder.Services.AddSingleton<WelcomeViewModel>();
            builder.Services.AddSingleton<LoginViewModel>();
            builder.Services.AddSingleton<HomeViewModel>();

#if DEBUG
            builder.Logging.AddDebug(); // debug logs
#endif

            return builder.Build(); // build the app
        }
    }
}
