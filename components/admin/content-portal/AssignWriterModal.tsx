"use client";

import type { Writer } from "./types";

export function AssignWriterModal({
  writers,
  onClose,
  onAssign,
}: {
  writers: Writer[];
  onClose: () => void;
  onAssign: (writer: Writer) => void;
}) {
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-5" onClick={onClose} role="presentation">
      <div
        className="w-[480px] max-w-full bg-white shadow-[0_32px_80px_rgba(0,0,0,.35)] animate-[fadeUp_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="border-b border-[#E2DFD9] bg-[#00143A] p-[14px_18px]">
          <div className="font-display text-sm font-bold text-white">Assign writer</div>
          <div className="mt-0.5 font-mono text-[8px] text-white/45">Select a content team member</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {writers.map((writer) => {
            const availSt =
              writer.availability === "AVAILABLE"
                ? { bg: "rgba(10,110,69,.08)", color: "#0A6E45" }
                : { bg: "rgba(212,129,10,.08)", color: "#D4810A" };
            return (
              <button
                className="writer-opt mb-1 flex w-full cursor-pointer items-center gap-3 border border-[#EEECE8] bg-white p-3 text-left"
                key={writer.id}
                onClick={() => onAssign(writer)}
                type="button"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: writer.avatarBg }}
                >
                  {writer.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-[#0D0E12]">{writer.name}</div>
                  <div className="text-[10px] text-[#6B6860]">{writer.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[7.5px] px-2 py-0.5" style={{ background: availSt.bg, color: availSt.color }}>
                    {writer.availability}
                  </div>
                  <div className="mt-1 font-mono text-[7.5px] text-[#A09D98]">{writer.activeTasks} active tasks</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="border-t border-[#E2DFD9] p-3">
          <button
            className="w-full cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] py-2 text-[10px] font-semibold text-[#3D3C38]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
