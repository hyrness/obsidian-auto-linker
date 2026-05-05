import IntervalTree from '@flatten-js/interval-tree';
import { TFile } from 'obsidian';

/**
 * Internal candidate-match record produced by the matching pipeline. Retains
 * the historical "VirtualMatch" name even though virtual-link DOM rendering
 * has been removed; the type is now a pure data class consumed by the
 * auto-link writer.
 */
export class VirtualMatch {
    constructor(
        public id: number,
        public originText: string,
        public from: number,
        public to: number,
        public files: TFile[],
        public isAlias: boolean,
        public isSubWord: boolean,
    ) {}

    static compare(a: VirtualMatch, b: VirtualMatch): number {
        if (a.from === b.from) {
            if (b.to == a.to) {
                return b.files.length - a.files.length;
            }
            return b.to - a.to;
        }
        return a.from - b.from;
    }

    static sort(matches: VirtualMatch[]): VirtualMatch[] {
        return Array.from(matches).sort(VirtualMatch.compare);
    }

    static filterAlreadyLinked(matches: VirtualMatch[], linkedFiles: Set<TFile>, mode: 'some' | 'every' = 'every'): VirtualMatch[] {
        return matches.filter((match) => {
            if (mode === 'every') {
                return !match.files.every((file) => linkedFiles.has(file));
            } else {
                return !match.files.some((file) => linkedFiles.has(file));
            }
        });
    }

    static filterOverlapping(matches: VirtualMatch[], onlyLinkOnce: boolean = true, excludedIntervalTree?: IntervalTree): VirtualMatch[] {
        const matchesToDelete: Map<number, boolean> = new Map();

        // Phase 1: Remove matches inside excluded blocks
        if (excludedIntervalTree) {
            for (const match of matches) {
                const overlaps = excludedIntervalTree.search([match.from, match.to]);
                if (overlaps.length > 0) {
                    matchesToDelete.set(match.id, true);
                }
            }
        }

        // Phase 2: Remove shorter overlapping matches (keep longer ones).
        // Matches are sorted by from asc, then to desc, so the first match at a
        // given position is always the longest — delete everything it overlaps.
        for (let i = 0; i < matches.length; i++) {
            const addition = matches[i];
            if (matchesToDelete.has(addition.id)) continue;

            for (let j = i + 1; j < matches.length; j++) {
                const other = matches[j];
                if (other.from >= addition.to) break;
                matchesToDelete.set(other.id, true);
            }
        }

        // Phase 3: onlyLinkOnce — remove same-file duplicates among survivors only.
        // Must run after phase 2 so that sub-matches of a duplicate are already
        // gone before the duplicate itself is removed.
        if (onlyLinkOnce) {
            const survivors = matches.filter((m) => !matchesToDelete.has(m.id));
            for (let i = 0; i < survivors.length; i++) {
                const addition = survivors[i];
                if (matchesToDelete.has(addition.id)) continue;
                for (let j = i + 1; j < survivors.length; j++) {
                    const other = survivors[j];
                    if (matchesToDelete.has(other.id)) continue;
                    if (other.files.every((f) => addition.files.contains(f))) {
                        matchesToDelete.set(other.id, true);
                    }
                }
            }
        }

        return matches.filter((match) => !matchesToDelete.has(match.id));
    }
}
