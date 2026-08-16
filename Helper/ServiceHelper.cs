namespace Yoton_Mobile.Helper
{
    public static class ServiceHelper
    {
        public static T GetService<T>() where T : notnull =>
             Current.GetService<T>() ?? throw new InvalidOperationException($"Service {typeof(T)} is not registered.");

        public static IServiceProvider Current =>
            IPlatformApplication.Current?.Services
                ?? throw new InvalidOperationException("IPlatformApplication.Current is not set.");
    }
}
