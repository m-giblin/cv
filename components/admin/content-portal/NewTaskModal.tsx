"use client";

export function NewTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-5" onClick={onClose} role="presentation">
      <div
        className="w-[520px] max-w-full bg-white shadow-[0_32px_80px_rgba(0,0,0,.35)] animate-[fadeUp_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="border-b border-[#E2DFD9] bg-[#00143A] p-[14px_18px]">
          <div className="font-display text-sm font-bold text-white">New content task</div>
          <div className="mt-0.5 font-mono text-[8px] text-white/45">Manual request — not AI-generated</div>
        </div>
        <div className="flex flex-col gap-3 p-[18px_20px]">
          <label className="block">
            <span className="mb-1 block font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Title</span>
            <input className="w-full border border-[#D4D1CB] p-2 text-[11px] outline-none focus:border-[#0071CE]" placeholder="Task title" type="text" />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Scenario context</span>
            <textarea className="h-20 w-full resize-none border border-[#D4D1CB] p-2 text-[11px] outline-none focus:border-[#0071CE]" placeholder="Describe the content need…" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Type</span>
              <select className="w-full border border-[#D4D1CB] p-2 text-[11px] outline-none">
                <option>Simulation</option>
                <option>Module</option>
                <option>Challenge</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Priority</span>
              <select className="w-full border border-[#D4D1CB] p-2 text-[11px] outline-none">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex gap-2 border-t border-[#E2DFD9] p-[14px_20px]">
          <button
            className="flex-1 cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] py-2 text-[10px] font-semibold text-[#3D3C38]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 cursor-pointer bg-[#0071CE] py-2 text-[10px] font-semibold text-white"
            onClick={onCreate}
            type="button"
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}
