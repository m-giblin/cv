"use client";

import { useCallback, useState } from "react";
import { PersonRecordWorkbench } from "@/components/record/person-record-workbench";

/** "My record": the person's own Record, in a workbench. */
export function MyRecordButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)} type="button">
        My record
      </button>
      {open ? <PersonRecordWorkbench onClose={close} personName={name} userId={userId} /> : null}
    </>
  );
}
