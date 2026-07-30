using Yoton_Mobile.ViewModels;

namespace Yoton_Mobile.Pages;

public partial class HomePage : ContentPage
{
	private IDispatcherTimer? _refreshTimer;

	public HomePage(HomeViewModel vm)
	{
		InitializeComponent();
        BindingContext = vm;
    }
    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await (BindingContext as HomeViewModel).InitializeAsync();

        // Catches a front-office confirmation (Pending -> Scheduled) while the patient is
        // sitting on the dashboard, without needing a real push notification (see
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
        if (BindingContext is HomeViewModel vm)
        {
            await vm.RefreshSilentlyAsync();
        }
    }

    private void OnMenuClicked(object sender, EventArgs e)
    {
        Shell.Current.FlyoutIsPresented = true;
    }

    private async void OnBookAppointmentTapped(object sender, EventArgs e)
    {
        await Shell.Current.GoToAsync("//dashboard/appointments");
    }
}
