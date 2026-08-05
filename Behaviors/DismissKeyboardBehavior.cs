using System.Linq;

namespace Yoton_Mobile.Behaviors;

// Attach to any ContentPage to let the user dismiss the soft keyboard by tapping
// anywhere outside the focused field — previously the only way was the keyboard's
// own Enter/Done key, which isn't obvious and adds an extra step every time.
// Tapping directly on an Entry/Editor/SearchBar still focuses it as normal; the
// native control consumes that touch before it reaches this page-level recognizer.
public class DismissKeyboardBehavior : Behavior<ContentPage>
{
    private TapGestureRecognizer? _tap;
    private ContentPage? _page;

    protected override void OnAttachedTo(ContentPage page)
    {
        base.OnAttachedTo(page);
        _page = page;
        _tap = new TapGestureRecognizer();
        _tap.Tapped += OnTapped;

        if (page.Content != null)
            page.Content.GestureRecognizers.Add(_tap);
    }

    protected override void OnDetachingFrom(ContentPage page)
    {
        base.OnDetachingFrom(page);
        if (_tap != null && page.Content != null)
            page.Content.GestureRecognizers.Remove(_tap);
        _tap = null;
        _page = null;
    }

    private void OnTapped(object? sender, TappedEventArgs e)
    {
        UnfocusDescendants(_page?.Content);
    }

    private static void UnfocusDescendants(Element? element)
    {
        switch (element)
        {
            case Entry { IsFocused: true } entry:
                entry.Unfocus();
                return;
            case Editor { IsFocused: true } editor:
                editor.Unfocus();
                return;
            case SearchBar { IsFocused: true } search:
                search.Unfocus();
                return;
        }

        switch (element)
        {
            case Layout layout:
                foreach (var child in layout.Children.OfType<Element>())
                    UnfocusDescendants(child);
                break;
            case ContentView { Content: not null } contentView:
                UnfocusDescendants(contentView.Content);
                break;
            case ScrollView { Content: not null } scrollView:
                UnfocusDescendants(scrollView.Content);
                break;
            case Border { Content: not null } border:
                UnfocusDescendants(border.Content);
                break;
            case ContentPage { Content: not null } contentPage:
                UnfocusDescendants(contentPage.Content);
                break;
        }
    }
}
