using Android.App;
using Android.Content.PM;
using Android.OS;

namespace Yoton_Mobile
{
    [Activity(Theme = "@style/Maui.SplashTheme", Exported = true, MainLauncher = true, LaunchMode = LaunchMode.SingleTop, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
    public class MainActivity : MauiAppCompatActivity
    {
        protected override void OnPostResume()
        {
            base.OnPostResume();
            Window?.DecorView?.Post(StyleFloatingTabBar);
        }

        private void StyleFloatingTabBar()
        {
            var tabBar = FindBottomNavigationView(Window?.DecorView);
            if (tabBar?.LayoutParameters is not Android.Views.ViewGroup.MarginLayoutParams layout)
                return;

            var horizontalMargin = ToPixels(20);
            layout.LeftMargin = horizontalMargin;
            layout.RightMargin = horizontalMargin;
            layout.BottomMargin = ToPixels(20);
            tabBar.LayoutParameters = layout;
            tabBar.Elevation = ToPixels(12);

            var background = new Android.Graphics.Drawables.GradientDrawable();
            background.SetColor(Android.Graphics.Color.White);
            background.SetCornerRadius(ToPixels(28));
            tabBar.Background = background;
        }

        private static Google.Android.Material.BottomNavigation.BottomNavigationView? FindBottomNavigationView(Android.Views.View? view)
        {
            if (view is Google.Android.Material.BottomNavigation.BottomNavigationView navigation)
                return navigation;

            if (view is not Android.Views.ViewGroup group)
                return null;

            for (var index = 0; index < group.ChildCount; index++)
            {
                var found = FindBottomNavigationView(group.GetChildAt(index));
                if (found is not null)
                    return found;
            }

            return null;
        }

        private int ToPixels(int densityIndependentPixels) =>
            (int)(densityIndependentPixels * Resources.DisplayMetrics!.Density + 0.5f);
    }
}
