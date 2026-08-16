using System.Globalization;

namespace Yoton_Mobile.Converters
{
    // Used to show/hide an unread-count badge - a Border isn't visible for a conversation
    // with nothing unread.
    public class IntGreaterThanZeroConverter : IValueConverter
    {
        public object Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
            => value is int i && i > 0;

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
            => throw new NotSupportedException();
    }
}
