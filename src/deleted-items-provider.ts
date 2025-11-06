import * as vscode from 'vscode';
import { DeletedItem } from './types';
import { BackupScanner } from './backup-scanner';
import { ItemOrganizer } from './item-organizer';
import { FileSystemUtils } from './file-system-utils';
import { 
    TREE_ITEM_CONTEXTS, 
    STATUS_INDICATORS 
} from './constants';

/**
 * Provides tree data for the deleted items view in VS Code's Explorer
 */
export class DeletedItemsProvider implements vscode.TreeDataProvider<DeletedItem> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<DeletedItem | undefined | void>();
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private deletedItems: DeletedItem[] = [];
    private organizedItems: DeletedItem[] = [];

    /**
     * Refreshes the tree by scanning for deleted items and reorganizing
     */
    async refresh(): Promise<void> {
        await this.loadDeletedItems();
        this.organizeItems();
        this.notifyTreeChanged();
    }

    /**
     * Gets tree item representation for VS Code's tree view
     */
    getTreeItem(element: DeletedItem): vscode.TreeItem {
        return element.isDirectory ? 
            this.createFolderTreeItem(element) : 
            this.createFileTreeItem(element);
    }

    /**
     * Gets children for tree expansion
     */
    getChildren(element?: DeletedItem): Thenable<DeletedItem[]> {
        if (!element) {
            return Promise.resolve(this.organizedItems);
        }
        
        if (element.isDirectory && element.children) {
            return Promise.resolve(element.children);
        }
        
        return Promise.resolve([]);
    }

    /**
     * Gets parent element (not implemented as not needed)
     */
    getParent(element: DeletedItem): vscode.ProviderResult<DeletedItem> {
        return null;
    }

    /**
     * Gets all deleted items for multi-select operations
     */
    getSelectedItems(): DeletedItem[] {
        return [...this.deletedItems];
    }

    /**
     * Loads deleted items from backup locations
     */
    private async loadDeletedItems(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders?.length) {
            console.log('No workspace folders found');
            this.deletedItems = [];
            return;
        }

        console.log('Starting scan for deleted items...');
        
        try {
            const scanResults = await this.scanWorkspaceFolders(workspaceFolders);
            this.deletedItems = scanResults;
            console.log(`Scan complete. Found ${this.deletedItems.length} deleted items`);
        } catch (error) {
            console.error('Failed to scan for deleted items:', error);
            this.deletedItems = [];
        }
    }

    /**
     * Scans all workspace folders for deleted items
     */
    private async scanWorkspaceFolders(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<DeletedItem[]> {
        const allItems: DeletedItem[] = [];

        for (const workspaceFolder of workspaceFolders) {
            console.log(`Scanning workspace folder: ${workspaceFolder.uri.fsPath}`);
            
            const scanner = new BackupScanner(workspaceFolder.uri.fsPath);
            const scanResult = await scanner.scanAllBackupLocations();
            
            allItems.push(...scanResult.items);
            
            if (scanResult.errors.length > 0) {
                console.warn(`Scan errors for ${workspaceFolder.name}:`, scanResult.errors);
            }
        }

        return allItems;
    }

    /**
     * Organizes flat list of items into hierarchical structure
     */
    private organizeItems(): void {
        const workspaceRoot = this.getWorkspaceRoot();
        
        if (!workspaceRoot) {
            this.organizedItems = [];
            return;
        }

        const organizer = new ItemOrganizer(workspaceRoot);
        this.organizedItems = organizer.organizeItemsByFolder(this.deletedItems);
    }

    /**
     * Gets the workspace root path
     */
    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    /**
     * Creates tree item for folder display
     */
    private createFolderTreeItem(element: DeletedItem): vscode.TreeItem {
        const displayName = this.getFolderDisplayName(element);
        const fileCount = element.children?.length || 0;

        const treeItem = new vscode.TreeItem(
            displayName,
            vscode.TreeItemCollapsibleState.Expanded
        );

        treeItem.tooltip = this.createFolderTooltip(element, fileCount);
        treeItem.description = `${fileCount} file(s)`;
        treeItem.contextValue = TREE_ITEM_CONTEXTS.DELETED_FOLDER;
        treeItem.iconPath = vscode.ThemeIcon.Folder;

        return treeItem;
    }

    /**
     * Creates tree item for file display
     */
    private createFileTreeItem(element: DeletedItem): vscode.TreeItem {
        const displayName = this.getFileDisplayName(element);
        const fileStatus = this.analyzeFileStatus(element);

        const treeItem = new vscode.TreeItem(
            displayName,
            vscode.TreeItemCollapsibleState.None
        );

        treeItem.tooltip = this.createFileTooltip(element, fileStatus);
        treeItem.description = this.createFileDescription(element, fileStatus);
        treeItem.contextValue = TREE_ITEM_CONTEXTS.DELETED_ITEM;
        
        this.setFileIcon(treeItem, element, fileStatus);

        return treeItem;
    }

    /**
     * Gets display name for folders
     */
    private getFolderDisplayName(element: DeletedItem): string {
        const baseName = element.relativePath.split('/').pop();
        return baseName || element.relativePath;
    }

    /**
     * Gets display name for files
     */
    private getFileDisplayName(element: DeletedItem): string {
        return element.relativePath.split('/').pop() || element.relativePath;
    }

    /**
     * Analyzes file status for display purposes
     */
    private analyzeFileStatus(element: DeletedItem): FileStatusInfo {
        const fileExists = FileSystemUtils.fileExists(element.uri.fsPath);
        const backupExists = element.backupPath ? FileSystemUtils.fileExists(element.backupPath) : false;
        
        return {
            fileExists,
            backupExists,
            hasBackupPath: !!element.backupPath,
            hasIssues: fileExists || !backupExists || !element.backupPath
        };
    }

    /**
     * Creates tooltip for folders
     */
    private createFolderTooltip(element: DeletedItem, fileCount: number): string {
        return `Folder with ${fileCount} deleted file(s)\nLatest deletion: ${element.deletionTime.toLocaleString()}`;
    }

    /**
     * Creates tooltip for files
     */
    private createFileTooltip(element: DeletedItem, status: FileStatusInfo): string {
        let tooltip = `Deleted: ${element.deletionTime.toLocaleString()}\nPath: ${element.relativePath}\nBackup: ${element.backupPath || 'N/A'}`;
        
        if (status.fileExists) {
            tooltip += STATUS_INDICATORS.EXISTS_SUFFIX;
        }
        
        if (!status.backupExists && element.backupPath) {
            tooltip += STATUS_INDICATORS.BACKUP_MISSING_SUFFIX;
        }
        
        if (!status.hasBackupPath) {
            tooltip += STATUS_INDICATORS.NO_BACKUP_PATH_SUFFIX;
        }

        return tooltip;
    }

    /**
     * Creates description for files
     */
    private createFileDescription(element: DeletedItem, status: FileStatusInfo): string {
        let description = element.deletionTime.toLocaleDateString();
        
        if (status.hasIssues) {
            description = STATUS_INDICATORS.WARNING + description;
        }
        
        return description;
    }

    /**
     * Sets appropriate icon for files
     */
    private setFileIcon(treeItem: vscode.TreeItem, element: DeletedItem, status: FileStatusInfo): void {
        if (!status.fileExists) {
            // Use resourceUri for deleted files to get language-specific icons
            treeItem.resourceUri = element.uri;
        } else {
            // For files that still exist, use generic file icon
            treeItem.iconPath = vscode.ThemeIcon.File;
        }
    }

    /**
     * Notifies VS Code that the tree data has changed
     */
    private notifyTreeChanged(): void {
        this.onDidChangeTreeDataEmitter.fire();
    }
}

/**
 * Information about file status for display purposes
 */
interface FileStatusInfo {
    fileExists: boolean;
    backupExists: boolean;
    hasBackupPath: boolean;
    hasIssues: boolean;
}