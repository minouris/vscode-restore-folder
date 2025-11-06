import * as path from 'path';
import * as vscode from 'vscode';
import { DeletedItem } from './types';

/**
 * Handles restoration of deleted files and folders
 */
export class FileRestorer {

    /**
     * Restores a single deleted item (file or empty directory)
     */
    static async restoreItem(item: DeletedItem): Promise<void> {
        if (item.isDirectory) {
            await this.restoreEmptyDirectory(item);
        } else {
            await this.restoreFile(item);
        }
    }

    /**
     * Recursively restores a folder and all its contents
     */
    static async restoreFolder(folderItem: DeletedItem): Promise<void> {
        if (!folderItem.isDirectory || !folderItem.children) {
            throw new Error('Invalid folder item for restoration');
        }

        const restorationResult = await this.restoreFolderContents(folderItem);
        
        if (restorationResult.failed > 0) {
            throw new Error(
                `Restored ${restorationResult.restored} items, but ${restorationResult.failed} items failed to restore`
            );
        }

        console.log(`Successfully restored folder "${folderItem.relativePath}" with ${restorationResult.restored} files`);
    }

    /**
     * Restores a file from its backup
     */
    private static async restoreFile(item: DeletedItem): Promise<void> {
        if (!item.backupPath) {
            throw new Error(`No backup path available for ${item.relativePath}`);
        }

        await this.ensureDirectoryExists(item.uri);
        
        const backupContent = await this.readBackupContent(item.backupPath);
        await vscode.workspace.fs.writeFile(item.uri, backupContent);
        
        console.log(`Restored file ${item.relativePath} from ${item.backupPath}`);
        
        await this.attemptToOpenRestoredFile(item.uri);
    }

    /**
     * Creates an empty directory structure
     */
    private static async restoreEmptyDirectory(item: DeletedItem): Promise<void> {
        await vscode.workspace.fs.createDirectory(item.uri);
        console.log(`Created directory ${item.relativePath}`);
    }

    /**
     * Restores all contents of a folder recursively
     */
    private static async restoreFolderContents(folderItem: DeletedItem): Promise<{ restored: number; failed: number }> {
        if (!folderItem.children) {
            return { restored: 0, failed: 0 };
        }

        let restored = 0;
        let failed = 0;

        // First create the folder itself
        try {
            await this.restoreItem(folderItem);
            restored++;
        } catch (error) {
            console.error(`Failed to create folder ${folderItem.relativePath}:`, error);
            failed++;
        }

        // Then restore all child items
        for (const childItem of folderItem.children) {
            try {
                if (childItem.isDirectory && childItem.children) {
                    const childResult = await this.restoreFolderContents(childItem);
                    restored += childResult.restored;
                    failed += childResult.failed;
                } else {
                    await this.restoreItem(childItem);
                    restored++;
                }
            } catch (error) {
                console.error(`Failed to restore ${childItem.relativePath}:`, error);
                failed++;
            }
        }

        return { restored, failed };
    }

    /**
     * Ensures the parent directory exists for a file
     */
    private static async ensureDirectoryExists(fileUri: vscode.Uri): Promise<void> {
        const targetDir = path.dirname(fileUri.fsPath);
        const directoryUri = vscode.Uri.file(targetDir);
        
        try {
            await vscode.workspace.fs.createDirectory(directoryUri);
        } catch (error) {
            // Directory might already exist, which is fine
            console.log(`Directory creation info: ${error}`);
        }
    }

    /**
     * Reads the backup file content
     */
    private static async readBackupContent(backupPath: string): Promise<Uint8Array> {
        try {
            return await vscode.workspace.fs.readFile(vscode.Uri.file(backupPath));
        } catch (error) {
            throw new Error(`Failed to read backup file ${backupPath}: ${error}`);
        }
    }

    /**
     * Attempts to open the restored file in VS Code (optional)
     */
    private static async attemptToOpenRestoredFile(fileUri: vscode.Uri): Promise<void> {
        try {
            await vscode.commands.executeCommand('vscode.open', fileUri);
        } catch (error) {
            // Opening the file is optional, just log if it fails
            console.log(`Could not open restored file: ${error}`);
        }
    }

    /**
     * Validates that an item can be restored
     */
    static canRestoreItem(item: DeletedItem): { canRestore: boolean; reason?: string } {
        if (item.isDirectory) {
            return { canRestore: true };
        }

        if (!item.backupPath) {
            return { 
                canRestore: false, 
                reason: 'No backup path available' 
            };
        }

        // Could add more validation here (backup file exists, permissions, etc.)
        return { canRestore: true };
    }

    /**
     * Validates that a folder can be restored
     */
    static canRestoreFolder(folderItem: DeletedItem): { canRestore: boolean; reason?: string } {
        if (!folderItem.isDirectory) {
            return { 
                canRestore: false, 
                reason: 'Item is not a directory' 
            };
        }

        if (!folderItem.children || folderItem.children.length === 0) {
            return { 
                canRestore: false, 
                reason: 'Folder has no children to restore' 
            };
        }

        // Check if any child items can be restored
        const restorableChildren = folderItem.children.filter(child => 
            this.canRestoreItem(child).canRestore
        );

        if (restorableChildren.length === 0) {
            return { 
                canRestore: false, 
                reason: 'No restorable items in folder' 
            };
        }

        return { canRestore: true };
    }
}