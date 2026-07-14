// ============================================================
// CoachingNoteModal.tsx — Log coaching note modal
// ============================================================
import React, { useRef } from 'react';

interface Props {
  seName: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function CoachingNoteModal({ seName, onClose, onSave }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', width: 480, boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: '#00143A', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,.7)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Log coaching note — {seName}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#A09D98', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>Session notes</div>
          <textarea
            ref={ref}
            autoFocus
            placeholder="What did you cover? What did you observe? What's the follow-up?"
            style={{ width: '100%', height: 120, border: '1px solid #D4D1CB', padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#0D0E12', resize: 'none', outline: 'none', lineHeight: 1.5, display: 'block' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #D4D1CB', color: '#3D3C38', fontSize: 10, fontWeight: 600, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(ref.current?.value || '')} style={{ background: '#0071CE', border: 'none', color: 'white', fontSize: 10, fontWeight: 600, padding: '5px 10px', cursor: 'pointer' }}>Save note</button>
          </div>
        </div>
      </div>
    </div>
  );
}
