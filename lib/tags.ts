/**
 * Obsidian-style inline tags: any `#word` inside note content is a tag.
 * Word characters, digits, dash and underscore after the `#`.
 *
 * The `#` must start a line or follow whitespace so URLs (`https://`) and
 * anchor hashes don't turn into tags, and `##` heading markers are excluded
 * because the word after them belongs to the heading text, not a tag.
 */

/** Word part of a tag once the `#` is confirmed (autocomplete-friendly). */
export const TAG_WORD = /[A-Za-z0-9][A-Za-z0-9_-]*/;

/**
 * Every tag in a markdown body, first-appearance order, max length guarded.
 * Headings (`# Title`, `## Sub`) are skipped via the leading-whitespace
 * requirement, and fenced code blocks are not scanned.
 */
export function extractTags(content: string): string[] {
  if (!content) return [];
  const tags: string[] = [];
  const seen = new Set<string>();

  let inFence = false;
  for (const line of content.split("\n")) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const matches = line.matchAll(/(^|[\s(])#([A-Za-z][A-Za-z0-9_-]{0,31})/g);
    for (const match of matches) {
      const tag = match[2];
      if (tag && !seen.has(tag)) {
        seen.add(tag);
        tags.push(tag);
      }
    }
  }
  return tags;
}

/**
 * The `#tag` token ending right before the caret, or null.
 * Used by the editor's tag autocomplete.
 */
export function tagTokenBeforeCaret(
  text: string,
  caret: number,
): { tokenStart: number; query: string } | null {
  // Look back only as far as a tag can plausibly reach.
  const window = text.slice(Math.max(0, caret - 40), caret);
  const match = /(^|\s)#([A-Za-z][A-Za-z0-9_-]{0,31})$/.exec(window);
  if (!match) return null;
  const wordStart = caret - window.length + match[1].length + 1; // +1 = '#'
  return { tokenStart: wordStart, query: match[2] };
}
