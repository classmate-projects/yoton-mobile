using System.Diagnostics;

namespace Yoton_Mobile.Services
{
    public static class LogService
    {
        private static readonly string LogFilePath =
            Path.Combine(FileSystem.AppDataDirectory, "app_log.txt");

        public static void Write(string message)
        {
            try
            {
                var log = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {message}{Environment.NewLine}";
                File.AppendAllText(LogFilePath, log);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("LogService Error: " + ex.Message);
            }
        }
    }
}
