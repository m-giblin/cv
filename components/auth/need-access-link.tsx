"use client";

import { toast } from "sonner";

/** "Need access?" — accounts are created by an enablement admin, so this explains who to ask. */
export function NeedAccessLink() {
  return (
    <button
      className="link text-[13px]"
      onClick={() => toast("Ask your manager or enablement admin to invite you.")}
      type="button"
    >
      Need access?
    </button>
  );
}
