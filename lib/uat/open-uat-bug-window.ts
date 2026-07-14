const UAT_WINDOW_NAME = "se-uat-bug-tracker";
const UAT_WINDOW_FEATURES =
  "width=440,height=760,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes";

let uatPopup: Window | null = null;

/** Opens (or focuses) the dedicated UAT bug tracker popup — never overlays the main app. */
export function openUatBugWindow(): Window | null {
  if (typeof window === "undefined") return null;

  if (uatPopup && !uatPopup.closed) {
    uatPopup.focus();
    return uatPopup;
  }

  uatPopup = window.open("/uat-bugs", UAT_WINDOW_NAME, UAT_WINDOW_FEATURES);
  return uatPopup;
}
