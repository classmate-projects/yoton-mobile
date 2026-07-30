namespace Yoton_Mobile.Helper
{
    public static class ServiceHelper
    {
        public static T GetService<T>() =>
             Current.GetService<T>();

        public static IServiceProvider Current =>
            IPlatformApplication.Current.Services;
    }
}
