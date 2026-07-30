namespace Yoton_Mobile.BaseLibrary
{
    // Mirrors the { message, data } envelope every Yoton-API controller wraps its responses in.
    public class ApiEnvelope<T>
    {
        public string? Message { get; set; }
        public T? Data { get; set; }
    }
}
