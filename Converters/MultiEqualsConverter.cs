using System.Globalization;

namespace Yoton_Mobile.Converters
{
    // Used to scope a per-item UI element (e.g. an open reaction picker) to only the one
    // CollectionView row whose id matches a single "currently active id" property held on the
    // page's ViewModel - MAUI has no inline "==" expression in XAML, so this is the standard
    // way to compare two bound values.
    public class MultiEqualsConverter : IMultiValueConverter
    {
        public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            if (values == null || values.Length < 2) return false;
            var first = values[0] as string;
            if (string.IsNullOrEmpty(first)) return false;
            return values.All(v => (v as string) == first);
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
            => throw new NotSupportedException();
    }
}
