using System.Diagnostics;

namespace Yoton_Mobile.Services
{
    public static class LogService
    {
        // Guards against App.xaml.cs's AppDomain.CurrentDomain.FirstChanceException handler
        // re-entering this method: that handler calls Write() for every exception thrown
        // anywhere in the process, including one thrown by Write() itself (e.g. an
        // unpackaged Windows build - see Yoton-Mobile.csproj's WindowsPackageType=None -
        // where FileSystem.AppDataDirectory has no MSIX package identity to resolve against
        // and throws on every access). Without this guard that becomes unbounded recursion
        // and a StackOverflowException that takes the whole process down instantly, for a
        // failure that should just mean "no log entry got written this time."
        [ThreadStatic]
        private static bool _isWriting;

        public static void Write(string message)
        {
            if (_isWriting) return;

            _isWriting = true;
            try
            {
                // Resolved on every call, inside the try, rather than as a static readonly
                // field - a field initializer that throws (see above) fails outside any
                // try/catch here and permanently poisons every future call via a cached
                // TypeInitializationException.
                var logFilePath = Path.Combine(FileSystem.AppDataDirectory, "app_log.txt");
                var log = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {message}{Environment.NewLine}";
                File.AppendAllText(logFilePath, log);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("LogService Error: " + ex.Message);
            }
            finally
            {
                _isWriting = false;
            }
        }
    }
}
