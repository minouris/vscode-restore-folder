import * as vscode from 'vscode';
import { REFRESH_DEBOUNCE_DELAY_MS } from './constants';

/**
 * Manages file system watchers and debounced refresh operations
 */
export class FileWatcherManager {
    private fileWatchers: vscode.FileSystemWatcher[] = [];
    private refreshTimer: NodeJS.Timeout | null = null;
    private pendingRefresh = false;
    private refreshCallback: () => Promise<void>;

    constructor(refreshCallback: () => Promise<void>) {
        this.refreshCallback = refreshCallback;
    }

    /**
     * Sets up file watchers for all workspace folders
     */
    setupFileWatchers(): void {
        this.cleanupExistingWatchers();
        
        if (!this.hasWorkspaceFolders()) {
            return;
        }

        this.createWatchersForWorkspaceFolders();
    }

    /**
     * Disposes all file watchers and timers
     */
    dispose(): void {
        this.cleanupTimer();
        this.cleanupExistingWatchers();
    }

    /**
     * Gets all active file watchers for subscription management
     */
    getWatchers(): vscode.FileSystemWatcher[] {
        return [...this.fileWatchers];
    }

    /**
     * Triggers a debounced refresh operation
     */
    private triggerDebouncedRefresh(): void {
        this.cancelExistingTimer();
        
        if (this.shouldSkipRefresh()) {
            return;
        }

        this.scheduleRefresh();
    }

    /**
     * Creates file watchers for all workspace folders
     */
    private createWatchersForWorkspaceFolders(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            this.createWatcherForFolder(folder);
        }
    }

    /**
     * Creates a file watcher for a specific workspace folder
     */
    private createWatcherForFolder(folder: vscode.WorkspaceFolder): void {
        const pattern = new vscode.RelativePattern(folder, '**/*');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.setupWatcherEventHandlers(watcher);
        this.fileWatchers.push(watcher);
    }

    /**
     * Sets up event handlers for file watcher
     */
    private setupWatcherEventHandlers(watcher: vscode.FileSystemWatcher): void {
        watcher.onDidDelete((uri) => {
            console.log(`File deleted: ${uri.fsPath}`);
            this.triggerDebouncedRefresh();
        });

        watcher.onDidCreate((uri) => {
            console.log(`File created: ${uri.fsPath}`);
            this.triggerDebouncedRefresh();
        });
    }

    /**
     * Cleans up existing file watchers
     */
    private cleanupExistingWatchers(): void {
        this.fileWatchers.forEach(watcher => watcher.dispose());
        this.fileWatchers.length = 0;
    }

    /**
     * Cleans up the refresh timer
     */
    private cleanupTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
            this.pendingRefresh = false;
        }
    }

    /**
     * Cancels existing timer if running
     */
    private cancelExistingTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
    }

    /**
     * Checks if refresh should be skipped
     */
    private shouldSkipRefresh(): boolean {
        return this.pendingRefresh || !this.hasWorkspaceFolders();
    }

    /**
     * Schedules a debounced refresh
     */
    private scheduleRefresh(): void {
        this.pendingRefresh = true;
        
        this.refreshTimer = setTimeout(async () => {
            try {
                await this.refreshCallback();
            } catch (error) {
                console.error('Debounced refresh failed:', error);
            } finally {
                this.resetRefreshState();
            }
        }, REFRESH_DEBOUNCE_DELAY_MS);
    }

    /**
     * Resets the refresh state after completion
     */
    private resetRefreshState(): void {
        this.pendingRefresh = false;
        this.refreshTimer = null;
    }

    /**
     * Checks if workspace folders exist
     */
    private hasWorkspaceFolders(): boolean {
        return !!(vscode.workspace.workspaceFolders?.length);
    }
}