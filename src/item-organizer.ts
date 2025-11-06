import * as path from 'path';
import * as vscode from 'vscode';
import { DeletedItem } from './types';

/**
 * Organizes deleted items into a hierarchical folder structure for tree display
 */
export class ItemOrganizer {
    private readonly workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Organizes flat list of deleted items into hierarchical folder structure
     */
    organizeItemsByFolder(deletedItems: DeletedItem[]): DeletedItem[] {
        if (deletedItems.length === 0) {
            return [];
        }

        const folderMap = this.createFolderMap(deletedItems);
        const rootItems = this.extractRootItems(deletedItems);
        const topLevelItems = this.buildHierarchy(folderMap, rootItems);
        
        return this.sortItems(topLevelItems);
    }

    /**
     * Creates folder items for all directory paths found in deleted items
     */
    private createFolderMap(deletedItems: DeletedItem[]): Map<string, DeletedItem> {
        const folderMap = new Map<string, DeletedItem>();
        const allPaths = this.extractAllDirectoryPaths(deletedItems);

        for (const dirPath of allPaths) {
            if (this.shouldCreateFolderItem(dirPath, folderMap)) {
                const folderItem = this.createFolderItem(dirPath);
                folderMap.set(dirPath, folderItem);
            }
        }

        this.populateFoldersWithFiles(folderMap, deletedItems);
        this.updateFolderTimestamps(folderMap);

        return folderMap;
    }

    /**
     * Extracts all unique directory paths from deleted items
     */
    private extractAllDirectoryPaths(deletedItems: DeletedItem[]): Set<string> {
        const allPaths = new Set<string>();

        for (const item of deletedItems) {
            const dirPath = path.dirname(item.relativePath);
            
            if (this.isNotRootDirectory(dirPath)) {
                this.addPathHierarchy(dirPath, allPaths);
            }
        }

        return allPaths;
    }

    /**
     * Adds a directory path and all its parent paths to the set
     */
    private addPathHierarchy(dirPath: string, pathSet: Set<string>): void {
        let currentPath = dirPath;
        
        while (currentPath && this.isNotRootDirectory(currentPath)) {
            pathSet.add(currentPath);
            currentPath = path.dirname(currentPath);
        }
    }

    /**
     * Extracts files that are directly in the workspace root
     */
    private extractRootItems(deletedItems: DeletedItem[]): DeletedItem[] {
        return deletedItems.filter(item => {
            const dirPath = path.dirname(item.relativePath);
            return this.isRootDirectory(dirPath);
        });
    }

    /**
     * Builds the hierarchical structure from folders and root items
     */
    private buildHierarchy(folderMap: Map<string, DeletedItem>, rootItems: DeletedItem[]): DeletedItem[] {
        const topLevelItems: DeletedItem[] = [...rootItems];

        for (const [folderPath, folderItem] of folderMap.entries()) {
            const parentPath = path.dirname(folderPath);
            
            if (this.isTopLevelFolder(parentPath, folderMap)) {
                this.sortChildrenInFolder(folderItem);
                topLevelItems.push(folderItem);
            } else {
                this.addFolderToParent(folderPath, folderItem, folderMap);
            }
        }

        return topLevelItems;
    }

    /**
     * Populates folder items with their child files
     */
    private populateFoldersWithFiles(folderMap: Map<string, DeletedItem>, deletedItems: DeletedItem[]): void {
        for (const item of deletedItems) {
            const dirPath = path.dirname(item.relativePath);
            
            if (this.isNotRootDirectory(dirPath)) {
                const folderItem = folderMap.get(dirPath);
                
                if (folderItem?.children) {
                    folderItem.children.push(item);
                }
            }
        }
    }

    /**
     * Updates folder deletion times to match the latest file deletion
     */
    private updateFolderTimestamps(folderMap: Map<string, DeletedItem>): void {
        for (const folderItem of folderMap.values()) {
            if (folderItem.children?.length) {
                const latestDeletion = this.findLatestDeletionTime(folderItem.children);
                if (latestDeletion > folderItem.deletionTime) {
                    folderItem.deletionTime = latestDeletion;
                }
            }
        }
    }

    /**
     * Finds the latest deletion time among child items
     */
    private findLatestDeletionTime(children: DeletedItem[]): Date {
        return children.reduce((latest, child) => {
            return child.deletionTime > latest ? child.deletionTime : latest;
        }, new Date(0));
    }

    /**
     * Creates a folder item for the given directory path
     */
    private createFolderItem(dirPath: string): DeletedItem {
        return {
            uri: vscode.Uri.file(path.join(this.workspaceRoot, dirPath)),
            relativePath: dirPath,
            isDirectory: true,
            deletionTime: new Date(0), // Will be updated later
            backupPath: '',
            children: []
        };
    }

    /**
     * Adds a folder as a child of its parent folder
     */
    private addFolderToParent(folderPath: string, folderItem: DeletedItem, folderMap: Map<string, DeletedItem>): void {
        const parentPath = path.dirname(folderPath);
        const parentFolder = folderMap.get(parentPath);
        
        if (parentFolder?.children) {
            parentFolder.children.push(folderItem);
        }
    }

    /**
     * Sorts children within a folder (folders first, then files, alphabetically)
     */
    private sortChildrenInFolder(folderItem: DeletedItem): void {
        if (folderItem.children) {
            folderItem.children = this.sortItems(folderItem.children);
        }
    }

    /**
     * Sorts items with folders first, then files, all alphabetically
     */
    private sortItems(items: DeletedItem[]): DeletedItem[] {
        return items.sort((a, b) => {
            // Folders first
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }

            // Then alphabetically by name
            const nameA = this.getDisplayName(a);
            const nameB = this.getDisplayName(b);
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Gets the display name for an item (basename for both files and folders)
     */
    private getDisplayName(item: DeletedItem): string {
        return item.isDirectory ? 
            path.basename(item.relativePath) : 
            path.basename(item.relativePath);
    }

    /**
     * Checks if a directory path represents the root
     */
    private isRootDirectory(dirPath: string): boolean {
        return dirPath === '.' || dirPath === '';
    }

    /**
     * Checks if a directory path is not the root
     */
    private isNotRootDirectory(dirPath: string): boolean {
        return !this.isRootDirectory(dirPath);
    }

    /**
     * Checks if a folder should be created (not already exists)
     */
    private shouldCreateFolderItem(dirPath: string, folderMap: Map<string, DeletedItem>): boolean {
        return !folderMap.has(dirPath);
    }

    /**
     * Checks if a folder is top-level (has no parent in our folder map)
     */
    private isTopLevelFolder(parentPath: string, folderMap: Map<string, DeletedItem>): boolean {
        return this.isRootDirectory(parentPath) || !folderMap.has(parentPath);
    }
}