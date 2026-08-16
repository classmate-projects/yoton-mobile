using System.Linq;
using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Core;
using Foundation;
using UIKit;

namespace Yoton_Mobile
{
    // iOS has no equivalent of Android's WindowSoftInputMode=AdjustResize (see
    // Platforms/Android/MainActivity.cs) - the keyboard floats on top of the page instead
    // of shrinking it, so a focused field near the bottom of a form (e.g. the booking
    // panel's Notes editor, or the login form) ends up hidden behind it. This mirrors that
    // Android behavior manually: on keyboard show, pad the current page's bottom by the
    // keyboard height so its ScrollView has room to scroll the focused field into view; on
    // hide, remove the padding.
    [Register("AppDelegate")]
    public class AppDelegate : MauiUIApplicationDelegate
    {
        // Apple provides no API to block the screenshot gesture itself - a hard platform
        // limitation, not a gap here. Android's MainActivity.cs gets genuine prevention via
        // FLAG_SECURE; iOS can only detect a screenshot after it happened (for a warning) and
        // block screen recording/AirPlay mirroring specifically, by covering the screen for
        // as long as it's active - see FinishedLaunching below.
        private UIView? _captureOverlay;

        protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

        public override bool FinishedLaunching(UIApplication application, NSDictionary launchOptions)
        {
            var result = base.FinishedLaunching(application, launchOptions);

            NSNotificationCenter.DefaultCenter.AddObserver(UIKeyboard.WillShowNotification, notification =>
            {
                var frame = UIKeyboard.FrameEndFromNotification(notification);
                SetCurrentPageBottomPadding(frame.Height);
            });

            NSNotificationCenter.DefaultCenter.AddObserver(UIKeyboard.WillHideNotification, _ =>
            {
                SetCurrentPageBottomPadding(0);
            });

            NSNotificationCenter.DefaultCenter.AddObserver(UIApplication.UserDidTakeScreenshotNotification, _ =>
            {
                Toast.Make("Screenshots of this content aren't permitted", ToastDuration.Short).Show();
            });

            NSNotificationCenter.DefaultCenter.AddObserver(UIScreen.CapturedDidChangeNotification, _ =>
            {
                SetCaptureOverlayVisible(UIScreen.MainScreen.Captured);
            });

            return result;
        }

        private static void SetCurrentPageBottomPadding(double bottom)
        {
            var page = Microsoft.Maui.Controls.Application.Current?.Windows.FirstOrDefault()?.Page;
            if (page == null)
                return;

            var p = page.Padding;
            page.Padding = new Microsoft.Maui.Thickness(p.Left, p.Top, p.Right, bottom);
        }

        private void SetCaptureOverlayVisible(bool visible)
        {
            var keyWindow = UIApplication.SharedApplication.Windows.FirstOrDefault(w => w.IsKeyWindow);
            if (keyWindow == null)
                return;

            if (!visible)
            {
                _captureOverlay?.RemoveFromSuperview();
                _captureOverlay = null;
                return;
            }

            if (_captureOverlay != null)
                return;

            _captureOverlay = new UIView(keyWindow.Bounds)
            {
                BackgroundColor = UIColor.Black,
                AutoresizingMask = UIViewAutoresizing.FlexibleDimensions
            };
            _captureOverlay.AddSubview(new UILabel(keyWindow.Bounds)
            {
                Text = "Content hidden for your security",
                TextColor = UIColor.White,
                TextAlignment = UITextAlignment.Center,
                AutoresizingMask = UIViewAutoresizing.FlexibleDimensions
            });
            keyWindow.AddSubview(_captureOverlay);
        }
    }
}
