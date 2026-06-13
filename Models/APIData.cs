namespace Yoton_Mobile.Models
{
    public class APIData
    {
        public string message { get; set; }
        public string environment { get; set; }
        public DateTime serverTime { get; set; }
        public string database { get; set; }
        public string migrationsApplied { get; set; }
        public bool adminSeeded { get; set; }
        public string version { get; set; }
    }
}
