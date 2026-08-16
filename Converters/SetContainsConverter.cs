using System.Globalization;

namespace Yoton_Mobile.Converters
{
    // Used to show a per-row presence dot: values[0] is the ViewModel's current set of online
    // user ids, values[1] is that row's own OtherId. Reassigning the set (not mutating it in
    // place) is what makes this MultiBinding re-evaluate - see MessagesViewModel.OnlinePresence.
    public class SetContainsConverter : IMultiValueConverter
    {
        public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            if (values == null || values.Length < 2) return false;
            if (values[0] is not IEnumerable<string> set) return false;
            var id = values[1] as string;
            return !string.IsNullOrEmpty(id) && set.Contains(id);
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
            => throw new NotSupportedException();
    }
}
