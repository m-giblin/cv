import { AlertCircle } from "lucide-react";

/** Same visual/copy as the existing entitlements-tab unsaved indicator, shared so every tab is consistent. */
export function PlatformUnsavedBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-3 flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      Unsaved changes — save before leaving this tab.
    </div>
  );
}
