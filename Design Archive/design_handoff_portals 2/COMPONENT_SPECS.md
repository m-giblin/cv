# Component Specifications

## NavSidebar

### Props
```typescript
interface NavSidebarProps {
  tier: 'se' | 'manager' | 'admin';
  currentPage: string;
  onNavigate: (page: string) => void;
  notifications?: { href: string; count: number }[];
}
```

### Structure
```
<aside> 220px wide, bg #00143A, position fixed
  <div> top 2px accent gradient line
  <div> wordmark section (bordered bottom)
    <svg> SailPoint logo mark
    <div> "Enablement" Syne 800 14px white
    <div> "PLATFORM" DM Mono 8px rgba(255,255,255,.2)
    [Admin only] <div> tenant badge
  <nav> flex:1, overflow-y scroll
    [repeat per group]
    <div> group label — DM Mono 7.5px rgba(255,255,255,.38) letter-spacing .16em uppercase
    [repeat per item]
    <div> nav item — flex, gap 8px, padding 5px 14px 5px 16px
      <svg> icon 13×13, opacity .65
      <span> label DM Sans 11.5px 500
      [optional] <span> badge
  <div> user footer (bordered top)
    <div> avatar circle gradient
    <div> name + role label
```

### Active item
```css
background: rgba(255,255,255,0.06);
color: white;
border-left: 2px solid #0071CE;
```

### Collapsible section (MY SKILLS / MY ROLE)
```typescript
const [open, setOpen] = useState(false);
// Chevron: rotate(180deg) when open
// Content: conditionally rendered
```

---

## Topbar

### Structure
```
<header> height 44px, bg white, border-bottom 1px #E2DFD9
  <div> breadcrumb
    <span> section — DM Mono 10.5px #A09D98
    <span> › separator
    <span> page title — DM Mono 10.5px #3D3C38 weight 500
    [optional] <span> eyebrow tag
  <div> right actions
    [Admin test mode] orange banner strip
    <div> search input
    <button> notification bell
    <div> avatar
```

---

## BentoGrid cells

The standard data display pattern across all portals:

```tsx
// 3-zone asymmetric bento
<div className="grid gap-px" style={{ gridTemplateColumns: '55fr 27fr 18fr', background: '#E2DFD9' }}>
  <div className="bg-white p-4">{/* Zone 1 */}</div>
  <div className="bg-white">{/* Zone 2 */}</div>
  <div className="bg-[#F9F8F6]">{/* Zone 3 — metrics */}</div>
</div>
```

### Stat column (Zone 3 pattern)
```tsx
<div className="p-[14px] border-b border-[#ECEAE6]">
  <div className="font-mono text-[9px] text-[#B0ADA8] tracking-[.1em] uppercase mb-1">{label}</div>
  <div className="font-mono text-[48px] text-[color] leading-none tracking-[-0.02em]">{value}</div>
  <div className="font-mono text-[8.5px] text-[color] mt-1">{sub}</div>
</div>
```

---

## AlertStrip

```tsx
<div className="border-l-[3px] border-l-[#D4810A] bg-[#FFFBF0] p-[9px_14px] 
                border border-[rgba(212,129,10,.12)] border-l-0
                flex items-center justify-between gap-3">
  <div className="flex items-center gap-2">
    {/* warning icon */}
    <span className="text-[11.5px] text-[#5C4200] font-medium">{message}</span>
  </div>
  <Button size="sm" variant="outline">{cta}</Button>
</div>
```
Available accent colors: `#D4810A` (amber), `#B83128` (red), `#0071CE` (blue), `#0A6E45` (green).

---

## SEProfilePanel

```tsx
// Width: 510px, right-aligned slide-over
<div className="absolute inset-0 bg-[rgba(0,14,32,.48)] backdrop-blur-[1px] z-40"
     onClick={onClose} />
<div className="absolute top-0 right-0 h-full w-[510px] bg-white z-50 
                flex flex-col overflow-hidden border-l border-[#E2DFD9]
                shadow-[-20px_0_50px_rgba(0,14,32,.18)]">
  {/* Header with gradient bg */}
  {/* 4-stat strip — grid-cols-4 gap-px bg-[#E2DFD9] */}
  {/* Scroll body */}
    {/* Coaching snapshot — border-left 3px #0071CE, bg #F0F7FF */}
    {/* Assign sim */}
    {/* Cert gates — border-left 3px #0A6E45, bg #F0FDF7 */}
    {/* Competency focus — border-left 3px #CC27B0, bg #FDF0FA */}
</div>
```

---

## ProgressBar

3px height, animated from 0 on mount.

```tsx
<div className="h-[3px] bg-[#ECEAE6] relative overflow-hidden">
  <div 
    className="absolute top-0 left-0 h-full animate-[pf_1.1s_cubic-bezier(.16,1,.3,1)_forwards]"
    style={{ background: color, width: pct }}
  />
</div>
```

```css
@keyframes pf { from { width: 0; } }
```

For the double-bar competency bars in My Readiness:
```tsx
<div className="relative h-[6px] bg-[#ECEAE6]">
  {/* Team avg ghost bar */}
  <div className="absolute top-0 left-0 h-full bg-black/8" style={{ width: teamPct }} />
  {/* Your score bar */}
  <div className="absolute top-0 left-0 h-full animate-fill" style={{ background: color, width: yourPct }} />
  {/* Tick mark at team avg */}
  <div className="absolute top-[-2px] bottom-[-2px] w-[1.5px] bg-[#A09D98]" style={{ left: teamPct, transform: 'translateX(-50%)' }} />
</div>
```

---

## StatusTag

```tsx
<span className="inline-block font-mono text-[8px] tracking-[.09em] uppercase px-[6px] py-[2px]"
      style={{ background: bgColor, color: textColor }}>
  {label}
</span>
```

---

## AvatarInitials

```tsx
<div className="w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 font-mono text-[9px] font-medium text-white"
     style={{ background: gradientBg }}>
  {initials}
</div>
```

Gradients used (cycle through for multiple users):
```javascript
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#0033a1,#0071ce)',
  'linear-gradient(135deg,#0071ce,#0891b2)',
  'linear-gradient(135deg,#5b21b6,#7c3aed)',
  'linear-gradient(135deg,#0369a1,#0891b2)',
  'linear-gradient(135deg,#9d174d,#be185d)',
  'linear-gradient(135deg,#065f46,#059669)',
];
```

---

## FeatureFlagToggle

Custom 32×18px toggle — no border-radius.

```tsx
<div 
  onClick={onToggle}
  className="cursor-pointer flex-shrink-0"
  style={{ 
    width: 32, height: 18, 
    background: enabled ? '#0071CE' : '#E2DFD9',
    position: 'relative',
    transition: 'background 150ms'
  }}
>
  <div style={{
    position: 'absolute', top: 2, width: 14, height: 14,
    background: 'white',
    transform: enabled ? 'translateX(14px)' : 'translateX(2px)',
    transition: 'transform 150ms'
  }} />
</div>
```

---

## OTPInput (MFA)

```tsx
// 6 individual inputs, 44×52px each
<div className="flex gap-[7px]">
  {Array.from({ length: 6 }).map((_, i) => (
    <input
      key={i}
      type="text"
      maxLength={1}
      className="w-[44px] h-[52px] font-mono text-[22px] font-medium text-center 
                 border-[1.5px] border-[#D4D1CB] outline-none transition-colors
                 focus:border-[#0071CE]
                 data-[filled=true]:border-[#0071CE] data-[filled=true]:bg-[#F8FBFF]"
      style={{ borderRadius: 0 }}
    />
  ))}
</div>
```

Submit button opacity: 50% until all 6 inputs filled.

---

## SimWorkspace

3-col layout when active, col 3 swaps between live coaching → feedback:

```
Scenario brief (280px fixed) | Chat interface (1fr) | Coaching/Feedback (260px fixed)
```

### Chat message pattern
```tsx
// User message (right-aligned)
<div className="flex justify-end">
  <div className="max-w-[78%] bg-[#EEF4FF] border border-[rgba(0,113,206,.15)] p-[10px_13px]">
    <p className="text-[11.5px] text-[#0D0E12] leading-[1.65]">{text}</p>
  </div>
</div>

// AI persona message (left-aligned)  
<div className="flex gap-[9px]">
  <div className="w-[26px] h-[26px] bg-[#E2DFD9] flex items-center justify-center flex-shrink-0 font-mono text-[9px] text-[#6B6860]">
    {initials}
  </div>
  <div className="max-w-[78%] bg-[#F5F4F0] p-[10px_13px]">
    <p className="text-[11.5px] text-[#1A1A1A] leading-[1.65]">{text}</p>
  </div>
</div>
```

### Input bar with mic
```tsx
<div className="p-3 border-t border-[#ECEAE6] bg-white flex-shrink-0">
  {/* Mic toggle button */}
  <button 
    onClick={toggleMic}
    style={{ 
      border: `1px solid ${micActive ? '#B83128' : '#D4D1CB'}`,
      background: micActive ? '#FEF0EE' : '#fff',
      color: micActive ? '#B83128' : '#3D3C38'
    }}
  >
    {/* mic icon */}
    {micActive ? 'Stop mic' : 'Use microphone'}
  </button>
  {/* Text input area */}
  {/* Rubric live indicators + End session button */}
</div>
```

---

## ChallengePortal

### Library panel (380px)
```
Search bar (border 1px, #F9F8F6 bg)
Filter chips (flat, no border-radius)
4 dropdown filters (grid-cols-4)
Gap recommendation banner (bg #F5F0FF)
Challenge list (scrollable)
  Each row: status dot + title + competency tag + time + status badge
```

### Detail panel
```
3px gradient top border (violet)
Badge strip (level, difficulty, curated, status)
Title Syne 800 19px
Steps: numbered squares #EEF4FF bg
Success criteria: check circle icons (stroke #0A6E45)
Resources: link row
Submission form: dashed upload, link input, reflection textarea, submit button
```

---

## Identity Graph (Login page)

SVG embedded in left panel at `opacity: .18`:
- Diamond nodes: `<rect>` rotated 45deg — sizes 6–16px
- Connection lines: dashed `stroke-dasharray="4 6"`, 0.8px stroke
- Center node: large white diamond + blue circle fill
- Colors: blue `#0071CE`, magenta `#CC27B0`, white at various opacities
- Positioned absolutely over the panel, `pointer-events: none`

---

## Grid line table headers

All table column headers follow this pattern:
```tsx
<div className="grid p-[6px_16px] border-b border-[#ECEAE6] bg-[#F9F8F6]"
     style={{ gridTemplateColumns: '1.8fr 100px 120px 100px ...' }}>
  {columns.map(col => (
    <span key={col} className="font-mono text-[7.5px] text-[#B0ADA8] tracking-[.12em] uppercase">
      {col}
    </span>
  ))}
</div>
```

Table rows hover: `bg-[#F0EFEB]` (use `hover:bg-[#F0EFEB]` in Tailwind).
