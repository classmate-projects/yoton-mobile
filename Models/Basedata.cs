namespace Yoton_Mobile.Models
{
    public class Basedata
    {
        public string? message { get; set; }
        public string? environment { get; set; }
        public DateTime serverTime { get; set; }
        public string? database { get; set; }
        public string? migrationsApplied { get; set; }
        public bool adminSeeded { get; set; }
        public string? swagger { get; set; }
        public string? apIversion { get; set; }
        public string? mobileVersion { get; set; }
        public string? webappVersion { get; set; }
    }
}
