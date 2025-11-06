import * as vscode from 'vscode';

/**
 * Represents a deleted file or folder with restoration metadata
 */
export interface DeletedItem {
    /** VS Code URI of the original file/folder location */
    uri: vscode.Uri;
    
    /** Path relative to workspace root */
    relativePath: string;
    
    /** True if this represents a deleted directory */
    isDirectory: boolean;
    
    /** When the item was deleted */
    deletionTime: Date;
    
    /** Path to the backup file (if available) */
    backupPath?: string;
    
    /** Child items for directories */
    children?: DeletedItem[];
    
    /** Metadata for native VS Code API integration */
    nativeHistoryEntry?: NativeHistoryEntry;
}

/**
 * Native VS Code history entry metadata for future API integration
 */
export interface NativeHistoryEntry {
    /** Original file URI */
    uri: vscode.Uri;
    
    /** Internal handle for VS Code's history system */
    handle: string;
}

/**
 * Platform-specific backup location configuration
 */
export interface PlatformPaths {
    CODE_USER_DATA: string[];
    WORKSPACE_STORAGE: string[];
    GLOBAL_STORAGE: string[];
    VSCODE_SERVER_HISTORY?: string[];
    VSCODE_SERVER_WORKSPACE?: string[];
}

/**
 * Backup file metadata from VS Code's entries.json
 */
export interface BackupEntry {
    /** VS Code version that created this backup */
    version: number;
    
    /** Original file URI (may include scheme) */
    resource: string;
    
    /** Additional metadata entries */
    entries?: unknown[];
}

/**
 * File scanning result containing deleted items and metadata
 */
export interface ScanResult {
    /** Found deleted items */
    items: DeletedItem[];
    
    /** Number of backup directories scanned */
    directoriesScanned: number;
    
    /** Errors encountered during scanning */
    errors: string[];
}