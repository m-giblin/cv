"use client";

import { useRef } from "react";

export function CoachingNoteModal({
  seName,
  onClose,
  onSave,
}: {
  seName: string;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/45"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="w-[480px] bg-white shadow-[0_24px_60px_rgba(0,0,0,.3)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="coaching-note-title"
      >
        <div className="flex items-center justify-between bg-[#00143A] px-[18px] py-3.5">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/70"
            id="coaching-note-title"
          >
            Log coaching note — {seName}
          </span>
          <button
            className="cursor-pointer border-none bg-transparent px-0.5 text-lg leading-none text-white/50"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="p-[18px]">
          <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
            Session notes
          </div>
          <textarea
            ref={ref}
            autoFocus
            className="block h-[120px] w-full resize-none border border-[#D4D1CB] p-[10px_12px] text-xs leading-normal text-[#0D0E12] outline-none"
            placeholder="What did you cover? What did you observe? What's the follow-up?"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="cursor-pointer border border-[#D4D1CB] bg-transparent px-2.5 py-[5px] text-[10px] font-semibold text-[#3D3C38]"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="cursor-pointer border-none bg-[#0071CE] px-2.5 py-[5px] text-[10px] font-semibold text-white"
              onClick={() => onSave(ref.current?.value ?? "")}
              type="button"
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
