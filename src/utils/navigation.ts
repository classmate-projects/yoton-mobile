import { router, type Href } from "expo-router";

// Makes `href` the only screen in the stack. The MAUI app did this by swapping the window's root
// page (Windows[0].Page = ...) whenever it crossed a session boundary - welcome/login <-> the
// tabs <-> the biometric lock - so the back button/swipe can never return to a screen from the
// other side (e.g. Back from Home landing on the login form, or Back after logout revealing
// somebody's health data).
export function resetTo(href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
