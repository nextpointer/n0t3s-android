/**
 * Small text helpers shared by the notes list, the widget sync bridge and
 * anywhere else that renders note snapshots outside the editor.
 */

/**
 * Compact relative time in the iOS style: "now", "34m", "5h", "Tue".
 * Days beyond the current week fall back to a short date that is stable,
 * unpredictable timezone shifts don't matter for a list row.
 */
export function relativeTime(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * First plain-text line of a markdown note, for list previews.
 * Strips the syntax a single line of prose can carry.
 */
export function notePreview(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/```[\s\S]*?(?:```|$)/g, " ") // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [link](url) → link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+(\[[ x]\]\s*)?/gm, "") // list + task bullets
    .replace(/^\s*[-*_]{3,}\s*$/gm, " ") // horizontal rules
    .replace(/(\*\*|__|~~|`)/g, "") // bold / italic / code / strike markers
    .replace(/\s+/g, " ")
    .trim();
}
