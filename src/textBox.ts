/** Size and place of the inserted text box; pure, so it is testable without the SDK. */

// shortcut: font size and glyph width are estimates; 32 was far too small on the Nomad (v0.0.2).
export const FONT_SIZE = 64;
const LINE_HEIGHT = FONT_SIZE * 1.5;
/** Generous average glyph width, so a line does not wrap in a box sized to it. */
const CHAR_WIDTH = FONT_SIZE * 0.62;
const PADDING = FONT_SIZE;
const MAX_WIDTH_RATIO = 0.9;

type Rect = {left: number; top: number; right: number; bottom: number};

/** A box as wide as the longest line (at most 90 % of the page), centered on the page. */
export function textBoxRect(
  text: string,
  page: {width: number; height: number},
): Rect {
  const lines = text.split('\n');
  const longest = Math.max(...lines.map(l => l.length));
  const width = Math.round(
    Math.min(page.width * MAX_WIDTH_RATIO, longest * CHAR_WIDTH + PADDING),
  );
  // Lines longer than the box wrap: count them for the height.
  const charsPerLine = Math.max(1, Math.floor((width - PADDING) / CHAR_WIDTH));
  const rows = lines.reduce(
    (n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)),
    0,
  );
  const height = Math.round(
    Math.min(page.height, rows * LINE_HEIGHT + PADDING / 2),
  );
  const left = Math.round((page.width - width) / 2);
  const top = Math.round((page.height - height) / 2);
  return {left, top, right: left + width, bottom: top + height};
}
