# Design Tokens

## Colors

### Brand palette
```css
/* Core navy */
--color-sp-navy-deep:  #00143A;   /* Sidebar bg, dark surfaces, CTA buttons */
--color-sp-navy-body:  #0A1628;   /* Body dark */
--color-sp-navy-muted: #3D3C38;   /* Primary text on light */

/* Blue family */
--color-sp-blue-deep:  #0033A1;   /* Deep blue, submit buttons */
--color-sp-blue:       #0071CE;   /* Interactive blue, active nav, links */

/* Accent */
--color-sp-magenta:    #CC27B0;   /* Cert gates, SE role accent */
--color-sp-violet:     #7c3aed;   /* Challenge type, SE practice accent */

/* Semantic */
--color-sp-green:      #0A6E45;   /* On track, approved, success */
--color-sp-amber:      #D4810A;   /* Warning, pending, due soon */
--color-sp-red:        #B83128;   /* At risk, blocked, error */

/* Neutrals */
--color-sp-border:     #E2DFD9;   /* Standard border */
--color-sp-border-alt: #ECEAE6;   /* Lighter divider */
--color-sp-surface:    #F5F4F0;   /* Page background */
--color-sp-surface-alt:#F9F8F6;   /* Card secondary bg */
--color-sp-surface-warm:#DEDAD4;  /* Canvas/outer bg */

/* Text */
--color-text-primary:  #0D0E12;   /* Headings, primary text */
--color-text-body:     #3D3C38;   /* Body text */
--color-text-muted:    #6B6860;   /* Secondary text */
--color-text-subtle:   #A09D98;   /* Meta, timestamps */
--color-text-ghost:    #B0ADA8;   /* Placeholders, disabled */
```

### Status colors (backgrounds)
```css
/* Green */
--bg-green:   #EDFAF3;   --text-green:  #0A6E45;
/* Blue */
--bg-blue:    #EEF4FF;   --text-blue:   #0071CE; /* or #1D4ED8 */
/* Amber */
--bg-amber:   #FFFBF0;   --text-amber:  #D4810A;
/* Red */
--bg-red:     #FEF0EE;   --text-red:    #B83128;
/* Violet */
--bg-violet:  #EDE9FE;   --text-violet: #5b21b6;
/* Magenta */
--bg-magenta: #FDF0FA;   --text-magenta:#A51E8E;
```

### Sidebar-specific
```css
--sidebar-bg:          #00143A;
--sidebar-active-bg:   rgba(255,255,255,0.06);
--sidebar-active-border: #0071CE;
--sidebar-inactive:    rgba(255,255,255,0.62);
--sidebar-inactive-hover: rgba(255,255,255,0.90);
--sidebar-section-label: rgba(255,255,255,0.38);
--sidebar-divider:     rgba(255,255,255,0.05);
```

---

## Typography

### Font stack
```css
font-family: 'Syne', sans-serif;      /* Display — headings only */
font-family: 'DM Sans', sans-serif;   /* Body — everything else */
font-family: 'DM Mono', monospace;    /* Data — numbers, tags, labels */
```

### Scale
| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `display-xl` | Syne | 48px | 800 | Login headline |
| `display-lg` | Syne | 30px | 800 | Page titles (portals) |
| `display-md` | Syne | 24px | 800 | Panel titles, card headers |
| `display-sm` | Syne | 13.5–14px | 700 | Section headers, widget titles |
| `body-lg` | DM Sans | 13.5px | 400 | Left panel body copy |
| `body-md` | DM Sans | 12.5px | 400 | Standard body |
| `body-sm` | DM Sans | 11.5px | 400/500 | Table rows, list items |
| `body-xs` | DM Sans | 11px | 400 | Secondary body |
| `mono-xl` | DM Mono | 48px | 400 | Hero metric numbers |
| `mono-lg` | DM Mono | 34–38px | 400 | Overview stats |
| `mono-md` | DM Mono | 22–28px | 400/500 | Card stats |
| `mono-sm` | DM Mono | 13–15px | 400/500 | Score values, leaderboard |
| `mono-xs` | DM Mono | 10.5px | 400 | Timestamps, meta |
| `label` | DM Mono | 8–9px | 400 | Section labels, tags |

### Letter-spacing
```css
/* Section labels */
letter-spacing: .16em;   /* UPPERCASE section nav labels */
letter-spacing: .12em;   /* Table column headers */
letter-spacing: .10em;   /* Stat labels */
letter-spacing: .08em;   /* Tags, badges */
```

---

## Geometry

### Borders
```css
border: 1px solid #E2DFD9;          /* Standard card */
border: 1.5px solid #D4D1CB;        /* Form inputs (unfocused) */
border: 1.5px solid #0071CE;        /* Form inputs (focused) */
border-left: 2px solid accent;      /* Inbox item accent */
border-left: 3px solid accent;      /* Page header, alert strip */
```

### Border radius
```css
border-radius: 0;        /* Everything — cards, buttons, inputs, panels */
border-radius: 50%;      /* Avatars only */
```
There are zero rounded cards, buttons, or inputs in this design system.

### Shadows
```css
/* App shell drop shadow */
box-shadow: 0 24px 70px rgba(0,0,0,.2);

/* Panel slide-over */
box-shadow: -20px 0 50px rgba(0,14,32,.18);
```
No card-level box shadows — depth comes from borders and background differentiation.

### Scrollbars
```css
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,.08); }
/* Dark sidebar */
.sidebar ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); }
```

---

## Grid technique (Bento grids)

The 1px grid line effect is achieved by:
```css
.bento {
  display: grid;
  grid-template-columns: 55fr 27fr 18fr; /* adjust per section */
  gap: 1px;
  background: #E2DFD9; /* border color shows through gaps */
}
.bento > * {
  background: #ffffff; /* or #F9F8F6 for secondary */
}
```
This creates sharp hairline dividers between cells without explicit borders.

---

## Animations

```css
/* Fade-in on mount */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.ai { animation: fadeIn .18s ease-out; }

/* Progress bar fill */
@keyframes pf { from { width: 0; } }
.pbar-fill { animation: pf 1.1s cubic-bezier(.16,1,.3,1) forwards; }

/* Pulse (status dots, badges) */
@keyframes pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .2; }
}
.lp { animation: pulse 2.4s ease-in-out infinite; }
```

---

## Tags / Status badges

```css
.tag {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: .09em;
  text-transform: uppercase;
  padding: 2px 6px;
  display: inline-block;
}
```
No border-radius. Background + text color set per status (see Status colors above).
