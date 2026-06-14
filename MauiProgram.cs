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

            // HttpClient for API calls
            builder.Services.AddHttpClient("YotonApi", client =>
            {
                client.BaseAddress = new Uri(APILibrary.BaseUrl);
                client.Timeout = TimeSpan.FromMinutes(2);
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
