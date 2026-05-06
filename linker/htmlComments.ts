/**
 * Find all HTML-comment ranges `<!-- ... -->` in `text`.
 *
 * Returns an array of `[start, end]` pairs where `start` is the offset of the
 * first `<` of `<!--` and `end` is the offset just past the final `>` of `-->`
 * (so `text.slice(start, end)` yields the full comment).
 *
 * If a `<!--` is never closed, the range extends to `text.length` — this matches
 * CommonMark's HTML-block type 2 behavior (an unterminated comment swallows the
 * rest of the input) and ensures words typed after an in-progress `<!--` are
 * not auto-linked.
 *
 * Comments do not nest: the first `-->` after a `<!--` closes it, even if a
 * second `<!--` appears in between.
 */
export function findHtmlCommentRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let i = 0;
    while (i < text.length) {
        const start = text.indexOf('<!--', i);
        if (start === -1) break;
        const closeIdx = text.indexOf('-->', start + 4);
        if (closeIdx === -1) {
            ranges.push([start, text.length]);
            break;
        }
        const end = closeIdx + 3;
        ranges.push([start, end]);
        i = end;
    }
    return ranges;
}
