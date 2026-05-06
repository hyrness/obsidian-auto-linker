import { describe, expect, it } from 'vitest';
import { findHtmlCommentRanges } from './htmlComments';

describe('findHtmlCommentRanges', () => {
    it('returns empty array for text with no comments', () => {
        expect(findHtmlCommentRanges('plain text without comments')).toEqual([]);
    });

    it('finds a single closed comment', () => {
        // Indices:    0         1
        //             0123456789012345
        // text:      'a <!-- b --> c'
        //               ^ start=2     ^ end=12 (exclusive, points just past '-->')
        expect(findHtmlCommentRanges('a <!-- b --> c')).toEqual([[2, 12]]);
    });

    it('extends an unclosed comment to end-of-input', () => {
        const text = 'a <!-- unclosed text';
        expect(findHtmlCommentRanges(text)).toEqual([[2, text.length]]);
    });

    it('finds multiple non-overlapping comments', () => {
        // text:      '<!-- a --> mid <!-- b -->'
        //  indices:   0         1         2
        //             0123456789012345678901234
        expect(findHtmlCommentRanges('<!-- a --> mid <!-- b -->')).toEqual([
            [0, 10],
            [15, 25],
        ]);
    });

    it('does not nest: the first --> closes the outer <!--', () => {
        // CommonMark: HTML comments do not nest. The first '-->' closes the open comment.
        // text:      '<!-- <!-- inner --> outer -->'
        //  indices:   0         1         2
        //             0123456789012345678901234567890
        // First '<!--' at 0, first '-->' at 16, end (exclusive) = 19.
        // After 19, ' outer -->' is plain text — no new '<!--' opens, so no second range.
        expect(findHtmlCommentRanges('<!-- <!-- inner --> outer -->')).toEqual([[0, 19]]);
    });

    it('handles a comment spanning multiple lines', () => {
        const text = 'before\n<!-- line1\nline2 -->\nafter';
        const start = text.indexOf('<!--');
        const end = text.indexOf('-->') + '-->'.length;
        expect(findHtmlCommentRanges(text)).toEqual([[start, end]]);
    });

    it('treats `<!-- -->` (empty comment) as a single range', () => {
        expect(findHtmlCommentRanges('<!-- -->')).toEqual([[0, 8]]);
    });

    it('returns empty for `-->` without an opening `<!--`', () => {
        // A stray '-->' is not a comment opener, so nothing should be flagged.
        expect(findHtmlCommentRanges('foo --> bar')).toEqual([]);
    });
});
