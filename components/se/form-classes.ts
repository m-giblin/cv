/**
 * v2 ("Runway × Credential") form and surface classes for the SE workspace.
 * Inputs: 1.5px line-strong border, radius 10, 15px text. Focus uses the global :focus-visible
 * outline plus a blue border, so never add `outline-none` on top of these.
 */
export const FIELD_CLS =
  "w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-[9px] text-[15px] text-ink placeholder:text-muted focus:border-blue disabled:bg-surface-2 disabled:text-muted";

export const TEXTAREA_CLS = `${FIELD_CLS} resize-y leading-[1.5]`;

export const SELECT_CLS = `${FIELD_CLS} cursor-pointer`;

export const LABEL_CLS = "text-sm font-bold text-ink";

/** Featured object: white, 1.5px ink border, radius 14. One per region. */
export const CARD_CLS = "rounded-[14px] border-[1.5px] border-ink bg-white";

/** Everything else: white, 1px line border, radius 14. Rows separated by divider. */
export const LINE_CARD_CLS = "rounded-[14px] border border-line bg-white";

/** Blue table header row with white mono 12 labels. */
export const TABLE_HEAD_CLS = "bg-blue font-mono text-xs font-medium uppercase tracking-[0.03em] text-white";

/** Section heading (h2): 18/800. */
export const H2_CLS = "text-lg font-extrabold text-ink";
