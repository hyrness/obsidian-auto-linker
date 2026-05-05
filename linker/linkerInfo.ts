import { LinkerPluginSettings } from "main";
import { App, getAllTags, TAbstractFile, TFile } from "obsidian";
import * as path from "path";

/**
 * Build the real-link replacement text for a match.
 * Returns the wiki/markdown link string that should replace the matched text.
 * Used by both the convert-to-real-link command and the auto-link-on-edit feature.
 */
export function buildRealLinkReplacement(
    app: App,
    settings: LinkerPluginSettings,
    targetFile: TFile,
    displayText: string,
    activeFilePath: string,
): string {
    let absolutePath = targetFile.path;
    let relativePath =
        path.relative(path.dirname(activeFilePath), path.dirname(absolutePath)) +
        '/' +
        path.basename(absolutePath);
    relativePath = relativePath.replace(/\\/g, '/');

    const replacementPath = app.metadataCache.fileToLinktext(targetFile, activeFilePath);
    const lastPart = replacementPath.split('/').pop()!;
    const shortestFile = app.metadataCache.getFirstLinkpathDest(lastPart, '');
    let shortestPath = shortestFile?.path === targetFile.path ? lastPart : absolutePath;

    if (!replacementPath.endsWith('.md')) {
        if (absolutePath.endsWith('.md')) absolutePath = absolutePath.slice(0, -3);
        if (shortestPath.endsWith('.md')) shortestPath = shortestPath.slice(0, -3);
        if (relativePath.endsWith('.md')) relativePath = relativePath.slice(0, -3);
    }

    const useMarkdownLinks = settings.useDefaultLinkStyleForConversion
        ? settings.defaultUseMarkdownLinks
        : settings.useMarkdownLinks;

    const linkFormat = settings.useDefaultLinkStyleForConversion
        ? settings.defaultLinkFormat
        : settings.linkFormat;

    if (replacementPath === displayText && linkFormat === 'shortest') {
        return `[[${replacementPath}]]`;
    }

    const linkPath =
        linkFormat === 'shortest' ? shortestPath :
        linkFormat === 'relative' ? relativePath :
        absolutePath;

    return useMarkdownLinks
        ? `[${displayText}](${linkPath})`
        : `[[${linkPath}|${displayText}]]`;
}


export class LinkerFileMetaInfo {
    file: TFile;
    tags: string[];
    includeFile: boolean;
    excludeFile: boolean;

    isInIncludedDir: boolean;
    isInExcludedDir: boolean;

    includeAllFiles: boolean;

    constructor(public fetcher: LinkerMetaInfoFetcher, file: TFile | TAbstractFile) {
        this.fetcher = fetcher;
        this.file = file instanceof TFile ? file : this.fetcher.app.vault.getFileByPath(file.path) as TFile;

        const settings = this.fetcher.settings;

        this.tags = (getAllTags(this.fetcher.app.metadataCache.getFileCache(this.file)!!) ?? [])
            .filter(tag => tag.trim().length > 0)
            .map(tag => tag.startsWith("#") ? tag.slice(1) : tag);

        this.includeFile = this.tags.includes(settings.tagToIncludeFile);
        this.excludeFile = this.tags.includes(settings.tagToExcludeFile);

        this.includeAllFiles = fetcher.includeAllFiles;
        this.isInIncludedDir = fetcher.includeDirPattern.test(this.file.path); //fetcher.includeAllFiles || 
        this.isInExcludedDir = fetcher.excludeDirPattern.test(this.file.path);
    }
}

export class LinkerMetaInfoFetcher {
    includeDirPattern: RegExp;
    excludeDirPattern: RegExp;
    includeAllFiles: boolean;

    constructor(public app: App, public settings: LinkerPluginSettings) {
        this.refreshSettings();
    }

    refreshSettings(settings?: LinkerPluginSettings) {
        this.settings = settings ?? this.settings;
        this.includeAllFiles = this.settings.includeAllFiles;
        this.includeDirPattern = new RegExp(`(^|\/)(${this.settings.linkerDirectories.join("|")})\/`);
        this.excludeDirPattern = new RegExp(`(^|\/)(${this.settings.excludedDirectories.join("|")})\/`);
    }

    getMetaInfo(file: TFile | TAbstractFile) {
        return new LinkerFileMetaInfo(this, file);
    }
}