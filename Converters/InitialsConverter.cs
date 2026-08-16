using System.Globalization;

namespace Yoton_Mobile.Converters
{
    // Mirrors the web app's lib/getInitials.ts exactly, so a contact's avatar circle shows
    // the same initials on both platforms.
    public class InitialsConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            var name = value as string;
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;

            if (name.StartsWith("Dr.", StringComparison.OrdinalIgnoreCase))
                name = name.Substring(3).TrimStart();

            return string.Concat(
                name.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Take(2)
                    .Select(part => char.ToUpperInvariant(part[0])));
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
            => throw new NotSupportedException();
    }
}
