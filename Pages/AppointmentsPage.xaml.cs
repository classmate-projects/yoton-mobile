using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class AppointmentsPage : ContentPage
{
    private IDispatcherTimer? _refreshTimer;

    public AppointmentsPage(AppointmentsViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as AppointmentsViewModel).InitializeAsync();

        // Catches a front-office confirmation (Pending -> Scheduled) while the patient is
        // sitting on this page, without needing a real push notification (see
        // Services/AppointmentStatusTracker.cs).
        _refreshTimer = Dispatcher.CreateTimer();
        _refreshTimer.Interval = TimeSpan.FromSeconds(60);
        _refreshTimer.Tick += OnRefreshTimerTick;
        _refreshTimer.Start();
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        _refreshTimer?.Stop();
        if (_refreshTimer != null)
            _refreshTimer.Tick -= OnRefreshTimerTick;
        _refreshTimer = null;
    }

    private async void OnRefreshTimerTick(object? sender, EventArgs e)
    {
        if (BindingContext is AppointmentsViewModel vm)
        {
            await vm.RefreshSilentlyAsync();
        }
    }
}
