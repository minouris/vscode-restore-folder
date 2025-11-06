import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DeletedItem, BackupEntry, ScanResult } from './types';
import { FileSystemUtils } from './file-system-utils';
import { ENTRIES_JSON_FILENAME, MAX_SCAN_DEPTH } from './constants';

/**
 * Handles scanning of VS Code backup directories for deleted files
 */
export class BackupScanner {
    private readonly workspacePath: string;
    private readonly deletedItems: DeletedItem[] = [];
    private directoriesScanned = 0;
    private errors: string[] = [];

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
    }

    /**
     * Scans all backup locations for deleted files
     */
    async scanAllBackupLocations(): Promise<ScanResult> {
        this.resetScanState();

        await this.scanWorkspaceBackups();
        await this.scanGlobalBackups();
        await this.scanVSCodeBackupLocations();

        return {
            items: [...this.deletedItems],
            directoriesScanned: this.directoriesScanned,
            errors: [...this.errors]
        };
    }

    /**
     * Scans workspace-local backup directories
     */
    private async scanWorkspaceBackups(): Promise<void> {
        const vscodeDir = path.join(this.workspacePath, '.vscode');
        const historyDir = path.join(vscodeDir, 'history');

        if (!FileSystemUtils.fileExists(historyDir)) {
            return;
        }

        console.log('Scanning workspace history directory:', historyDir);
        await this.scanHistoryDirectory(historyDir);
    }

    /**
     * Scans global VS Code backup directories
     */
    private async scanGlobalBackups(): Promise<void> {
        const globalBackupPath = FileSystemUtils.getGlobalBackupPath();
        
        if (!globalBackupPath || !FileSystemUtils.fileExists(globalBackupPath)) {
            return;
        }

        console.log('Scanning global backup directory:', globalBackupPath);
        await this.scanBackupDirectory(globalBackupPath);
    }

    /**
     * Scans platform-specific VS Code backup locations
     */
    private async scanVSCodeBackupLocations(): Promise<void> {
        const locations = FileSystemUtils.getVSCodeBackupLocations();
        
        console.log('Scanning VS Code backup locations:');
        for (const location of locations) {
            const exists = FileSystemUtils.fileExists(location);
            console.log(`  - ${location}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
            
            if (exists) {
                await this.scanBackupDirectory(location);
            }
        }
    }

    /**
     * Scans a history directory for file backups
     */
    private async scanHistoryDirectory(historyDir: string): Promise<void> {
        const entries = FileSystemUtils.readDirectorySafe(historyDir);
        
        for (const entry of entries) {
            if (!entry.isDirectory()) {continue;}

            const entryPath = path.join(historyDir, entry.name);
            await this.processFileHistory(entryPath);
        }
    }

    /**
     * Recursively scans backup directories with depth limiting
     */
    private async scanBackupDirectory(backupPath: string, currentDepth = 0): Promise<void> {
        if (currentDepth > MAX_SCAN_DEPTH) {
            return;
        }

        this.directoriesScanned++;

        try {
            const entriesJsonPath = path.join(backupPath, ENTRIES_JSON_FILENAME);
            if (FileSystemUtils.fileExists(entriesJsonPath)) {
                await this.processEntriesJson(entriesJsonPath, backupPath);
            }

            const entries = FileSystemUtils.readDirectorySafe(backupPath);
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subPath = path.join(backupPath, entry.name);
                    await this.scanBackupDirectory(subPath, currentDepth + 1);
                }
            }
        } catch (error) {
            const errorMessage = `Error scanning ${backupPath}: ${error}`;
            console.error(errorMessage);
            this.errors.push(errorMessage);
        }
    }

    /**
     * Processes VS Code's entries.json backup metadata
     */
    private async processEntriesJson(entriesJsonPath: string, backupPath: string): Promise<void> {
        const entries = FileSystemUtils.readJsonFileSafe<BackupEntry>(entriesJsonPath);
        
        if (!entries?.resource) {
            return;
        }

        const originalPath = FileSystemUtils.normalizeUriPath(entries.resource);
        
        if (!this.isValidDeletedFile(originalPath)) {
            return;
        }

        const newestBackupFile = this.findNewestBackupFile(backupPath);
        
        if (!newestBackupFile) {
            return;
        }

        const deletedItem = this.createDeletedItem(originalPath, newestBackupFile.path, newestBackupFile.stats);
        
        if (deletedItem) {
            this.deletedItems.push(deletedItem);
            console.log(`Added deleted item: ${deletedItem.relativePath}`);
        }
    }

    /**
     * Processes individual file history directories
     */
    private async processFileHistory(historyPath: string): Promise<void> {
        try {
            // If this history folder contains an entries.json, prefer using it
            const entriesJsonPath = path.join(historyPath, ENTRIES_JSON_FILENAME);
            if (FileSystemUtils.fileExists(entriesJsonPath)) {
                await this.processEntriesJson(entriesJsonPath, historyPath);
                return;
            }

            const newestBackup = this.findNewestBackupInHistory(historyPath);

            if (!newestBackup) {
                return;
            }

            const originalPath = FileSystemUtils.extractOriginalPathFromBackup(newestBackup.path, this.workspacePath);

            if (!originalPath || !this.isValidDeletedFile(originalPath)) {
                return;
            }

            const deletedItem = this.createDeletedItem(originalPath, newestBackup.path, newestBackup.stats);

            if (deletedItem) {
                this.deletedItems.push(deletedItem);
            }
        } catch (error) {
            const errorMessage = `Error processing file history ${historyPath}: ${error}`;
            console.error(errorMessage);
            this.errors.push(errorMessage);
        }
    }

    /**
     * Finds the newest backup file in a directory
     */
    private findNewestBackupFile(backupPath: string): { path: string; stats: fs.Stats } | null {
        const entries = FileSystemUtils.readDirectorySafe(backupPath);
        const backupFiles = entries
            .filter(entry => entry.isFile() && entry.name !== ENTRIES_JSON_FILENAME)
            .map(entry => entry.name);

        if (backupFiles.length === 0) {
            return null;
        }

        const sortedFiles = FileSystemUtils.sortBackupFilesByDate(backupPath, backupFiles);
        const newestFile = sortedFiles[0];
        const filePath = path.join(backupPath, newestFile);
        const stats = FileSystemUtils.getFileStatsSafe(filePath);

        return stats ? { path: filePath, stats } : null;
    }

    /**
     * Finds the newest backup in a history directory
     */
    private findNewestBackupInHistory(historyPath: string): { path: string; stats: fs.Stats } | null {
        const entries = FileSystemUtils.readDirectorySafe(historyPath);
        const backupFiles = entries.filter(entry => entry.isFile());

        if (backupFiles.length === 0) {
            return null;
        }

        // Sort by modification time, newest first
        const sortedFiles = backupFiles.sort((a, b) => {
            const pathA = path.join(historyPath, a.name);
            const pathB = path.join(historyPath, b.name);
            const statA = FileSystemUtils.getFileStatsSafe(pathA);
            const statB = FileSystemUtils.getFileStatsSafe(pathB);
            
            if (!statA || !statB) {return 0;}
            
            return statB.mtime.getTime() - statA.mtime.getTime();
        });

        const newestFile = sortedFiles[0];
        const filePath = path.join(historyPath, newestFile.name);
        const stats = FileSystemUtils.getFileStatsSafe(filePath);

        return stats ? { path: filePath, stats } : null;
    }

    /**
     * Checks if a file is truly deleted and within the workspace
     */
    private isValidDeletedFile(originalPath: string): boolean {
        return FileSystemUtils.isPathInWorkspace(originalPath, this.workspacePath) &&
               !FileSystemUtils.fileExists(originalPath);
    }

    /**
     * Creates a DeletedItem from backup metadata
     */
    private createDeletedItem(originalPath: string, backupPath: string, stats: fs.Stats): DeletedItem | null {
        try {
            const relativePath = path.relative(this.workspacePath, originalPath);
            
            return {
                uri: vscode.Uri.file(originalPath),
                relativePath,
                isDirectory: false,
                deletionTime: stats.mtime,
                backupPath,
                nativeHistoryEntry: {
                    uri: vscode.Uri.file(originalPath),
                    handle: path.basename(backupPath, path.extname(backupPath))
                }
            };
        } catch (error) {
            const errorMessage = `Error creating deleted item for ${originalPath}: ${error}`;
            console.error(errorMessage);
            this.errors.push(errorMessage);
            return null;
        }
    }

    /**
     * Resets the scan state for a fresh scan
     */
    private resetScanState(): void {
        this.deletedItems.length = 0;
        this.directoriesScanned = 0;
        this.errors.length = 0;
    }
}