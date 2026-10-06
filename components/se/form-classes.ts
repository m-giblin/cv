/**
 * v3 form and surface classes for the SE workspace.
 * Inputs: 1px #CFC7BA border, radius 10, 15px text. Focus uses the global :focus-visible
 * outline plus a blue border, so never add `outline-none` on top of these.
 */
export const FIELD_CLS =
  "w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-blue disabled:bg-surface-2 disabled:text-muted";

export const TEXTAREA_CLS = `${FIELD_CLS} resize-y leading-[1.5]`;

export const SELECT_CLS = `${FIELD_CLS} cursor-pointer`;

export const LABEL_CLS = "text-sm font-bold text-ink";

/** Card: white, 1px warm line, radius 14. v3 keeps heavy borders off everything but the step card. */
export const CARD_CLS = "rounded-[14px] border border-line bg-white";

/** Line card: white, 1px line border, radius 14. Rows separated by divider. */
export const LINE_CARD_CLS = "rounded-[14px] border border-line bg-white";

/** Table header row: 11px caps labels on white with a 1px line under it. */
export const TABLE_HEAD_CLS = "th border-b border-line bg-white";

/** Section heading (h2): 20/800. */
export const H2_CLS = "text-xl font-extrabold text-ink";
