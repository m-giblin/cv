import { Loader2 } from "lucide-react";
import { ActionBar } from "@/components/ui/action-bar";

/**
 * Sticky unsaved-changes bar shared by every platform form: "{n} unsaved changes", a mono summary,
 * Discard, and the view's one primary button. Callers should demote any other primary while it shows.
 */
export function PlatformUnsavedBanner({
  show,
  count,
  summary,
  saving = false,
  saveLabel = "Save changes",
  onDiscard,
  onSave,
}: {
  show: boolean;
  /** Number of changed fields; omit when it can't be counted. */
  count?: number;
  summary?: string;
  saving?: boolean;
  saveLabel?: string;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!show) return null;
  const label =
    count == null ? "Unsaved changes" : `${count} unsaved change${count === 1 ? "" : "s"}`;
  // Render as a direct child of the panel's root so it sticks for as long as the panel is on screen.
  // The negative margin lets it run edge to edge through the page gutter.
  return (
    <div className="sticky bottom-0 z-10 -mx-[var(--gutter)] mt-6">
      <ActionBar
        count={label}
        primary={
          <button
            className="btn-primary inline-flex items-center gap-2"
            disabled={saving}
            onClick={onSave}
            type="button"
          >
            {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : saveLabel}
          </button>
        }
        secondary={
          <button
            className="text-sm font-bold text-white underline decoration-on-blue-muted decoration-2 underline-offset-[3px] hover:decoration-white disabled:opacity-60"
            disabled={saving}
            onClick={onDiscard}
            type="button"
          >
            Discard
          </button>
        }
        summary={summary}
      />
    </div>
  );
}
