// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface DeletedItem {
	uri: vscode.Uri;
	relativePath: string;
	isDirectory: boolean;
	deletionTime: Date;
	backupPath: string;
}

class DeletedItemsProvider implements vscode.TreeDataProvider<DeletedItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<DeletedItem | undefined | void> = new vscode.EventEmitter<DeletedItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<DeletedItem | undefined | void> = this._onDidChangeTreeData.event;

	private deletedItems: DeletedItem[] = [];

	refresh(): void {
		this.deletedItems = [];
		this.loadDeletedItems();
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: DeletedItem): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.relativePath,
			element.isDirectory ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None
		);

		treeItem.tooltip = `Deleted: ${element.deletionTime.toLocaleString()}`;
		treeItem.description = element.deletionTime.toLocaleDateString();
		treeItem.contextValue = 'deletedItem';
		treeItem.iconPath = element.isDirectory ? 
			new vscode.ThemeIcon('folder') : 
			new vscode.ThemeIcon('file');

		return treeItem;
	}

	getChildren(element?: DeletedItem): Thenable<DeletedItem[]> {
		if (!element) {
			return Promise.resolve(this.deletedItems);
		}
		return Promise.resolve([]);
	}

	getParent(element: DeletedItem): vscode.ProviderResult<DeletedItem> {
		return null;
	}

	private loadDeletedItems(): void {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			return;
		}

		for (const workspaceFolder of workspaceFolders) {
			this.scanForBackupFiles(workspaceFolder.uri.fsPath);
		}
	}

	private scanForBackupFiles(workspacePath: string): void {
		// VS Code stores backup files in the user data directory
		// We'll look for .vscode folder and local history
		const vscodeDir = path.join(workspacePath, '.vscode');
		const historyDir = path.join(vscodeDir, 'history');

		if (fs.existsSync(historyDir)) {
			this.scanHistoryDirectory(historyDir, workspacePath);
		}

		// Also check global backup location (varies by OS)
		const globalBackupPath = this.getGlobalBackupPath();
		if (globalBackupPath && fs.existsSync(globalBackupPath)) {
			this.scanGlobalBackups(globalBackupPath, workspacePath);
		}
	}

	private getGlobalBackupPath(): string | null {
		const os = require('os');
		const platform = os.platform();
		const homedir = os.homedir();

		if (platform === 'win32') {
			return path.join(homedir, 'AppData', 'Roaming', 'Code', 'User', 'History');
		} else if (platform === 'darwin') {
			return path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'History');
		} else {
			return path.join(homedir, '.config', 'Code', 'User', 'History');
		}
	}

	private scanHistoryDirectory(historyDir: string, workspacePath: string): void {
		try {
			const entries = fs.readdirSync(historyDir, { withFileTypes: true });
			
			for (const entry of entries) {
				const entryPath = path.join(historyDir, entry.name);
				
				if (entry.isDirectory()) {
					// Each directory represents a file's history
					this.processFileHistory(entryPath, workspacePath);
				}
			}
		} catch (error) {
			console.error('Error scanning history directory:', error);
		}
	}

	private scanGlobalBackups(globalBackupPath: string, workspacePath: string): void {
		try {
			if (!fs.existsSync(globalBackupPath)) {
				return;
			}

			const entries = fs.readdirSync(globalBackupPath, { withFileTypes: true });
			
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const sessionPath = path.join(globalBackupPath, entry.name);
					this.scanSessionBackups(sessionPath, workspacePath);
				}
			}
		} catch (error) {
			console.error('Error scanning global backups:', error);
		}
	}

	private scanSessionBackups(sessionPath: string, workspacePath: string): void {
		try {
			const entries = fs.readdirSync(sessionPath, { withFileTypes: true });
			
			for (const entry of entries) {
				if (entry.isFile() && entry.name.endsWith('.json')) {
					const metaPath = path.join(sessionPath, entry.name);
					this.processBackupMetadata(metaPath, workspacePath);
				}
			}
		} catch (error) {
			console.error('Error scanning session backups:', error);
		}
	}

	private processFileHistory(historyPath: string, workspacePath: string): void {
		try {
			const entries = fs.readdirSync(historyPath, { withFileTypes: true });
			const backupFiles = entries
				.filter(entry => entry.isFile())
				.sort((a, b) => {
					// Sort by modification time, newest first
					const statA = fs.statSync(path.join(historyPath, a.name));
					const statB = fs.statSync(path.join(historyPath, b.name));
					return statB.mtime.getTime() - statA.mtime.getTime();
				});

			if (backupFiles.length > 0) {
				const newestBackup = backupFiles[0];
				const backupPath = path.join(historyPath, newestBackup.name);
				const stat = fs.statSync(backupPath);
				
				// Try to determine original file path from backup metadata
				const originalPath = this.extractOriginalPath(backupPath, workspacePath);
				
				if (originalPath && !fs.existsSync(originalPath)) {
					// File doesn't exist anymore, it was deleted
					const relativePath = path.relative(workspacePath, originalPath);
					
					this.deletedItems.push({
						uri: vscode.Uri.file(originalPath),
						relativePath,
						isDirectory: false,
						deletionTime: stat.mtime,
						backupPath
					});
				}
			}
		} catch (error) {
			console.error('Error processing file history:', error);
		}
	}

	private processBackupMetadata(metaPath: string, workspacePath: string): void {
		try {
			const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
			
			if (metadata.resource && metadata.resource.path) {
				const originalPath = metadata.resource.path;
				
				// Check if this file is within our workspace and doesn't exist
				if (originalPath.startsWith(workspacePath) && !fs.existsSync(originalPath)) {
					const relativePath = path.relative(workspacePath, originalPath);
					const stat = fs.statSync(metaPath);
					
					// Find corresponding backup file
					const backupFileName = path.basename(metaPath, '.json');
					const backupPath = path.join(path.dirname(metaPath), backupFileName);
					
					if (fs.existsSync(backupPath)) {
						this.deletedItems.push({
							uri: vscode.Uri.file(originalPath),
							relativePath,
							isDirectory: false,
							deletionTime: stat.mtime,
							backupPath
						});
					}
				}
			}
		} catch (error) {
			console.error('Error processing backup metadata:', error);
		}
	}

	private extractOriginalPath(backupPath: string, workspacePath: string): string | null {
		try {
			// Try to read backup file and extract original path from comments or metadata
			const content = fs.readFileSync(backupPath, 'utf8');
			
			// Look for VS Code backup metadata comments
			const lines = content.split('\n').slice(0, 10); // Check first 10 lines
			for (const line of lines) {
				if (line.includes('file://')) {
					const match = line.match(/file:\/\/([^"'\s]+)/);
					if (match) {
						return decodeURIComponent(match[1]);
					}
				}
			}
			
			// Fallback: try to construct path from backup structure
			const historyDir = path.dirname(path.dirname(backupPath));
			const fileName = path.basename(path.dirname(backupPath));
			return path.join(workspacePath, fileName);
		} catch (error) {
			return null;
		}
	}

	getSelectedItems(): DeletedItem[] {
		// In a real implementation, this would track selected items
		// For now, return all items for demonstration
		return this.deletedItems;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Restore Folder extension is now active!');

	const deletedItemsProvider = new DeletedItemsProvider();
	
	// Register tree data provider
	const treeView = vscode.window.createTreeView('deletedItems', {
		treeDataProvider: deletedItemsProvider,
		canSelectMany: true
	});

	// Register commands
	const listDeletedCommand = vscode.commands.registerCommand('minouris-local-history-restore.listDeleted', async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Scanning for deleted files...",
			cancellable: false
		}, async (progress) => {
			deletedItemsProvider.refresh();
			progress.report({ increment: 100 });
		});

		// Show the tree view
		vscode.commands.executeCommand('workbench.view.extension.deletedItems');
		vscode.window.showInformationMessage(`Found ${deletedItemsProvider.getSelectedItems().length} deleted items`);
	});

	const restoreSelectedCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreSelected', async () => {
		const selectedItems = treeView.selection;
		
		if (selectedItems.length === 0) {
			vscode.window.showWarningMessage('No items selected for restoration');
			return;
		}

		const confirmation = await vscode.window.showQuickPick(['Yes', 'No'], {
			placeHolder: `Restore ${selectedItems.length} item(s)?`
		});

		if (confirmation !== 'Yes') {
			return;
		}

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Restoring files...",
			cancellable: false
		}, async (progress) => {
			let restored = 0;
			
			for (const item of selectedItems) {
				try {
					await restoreItem(item);
					restored++;
					progress.report({ 
						increment: (100 / selectedItems.length),
						message: `Restored ${item.relativePath}`
					});
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to restore ${item.relativePath}: ${error}`);
				}
			}
			
			vscode.window.showInformationMessage(`Successfully restored ${restored} item(s)`);
			deletedItemsProvider.refresh();
		});
	});

	// Add context menu for tree items
	const restoreItemCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreItem', async (item: DeletedItem) => {
		try {
			await restoreItem(item);
			vscode.window.showInformationMessage(`Restored ${item.relativePath}`);
			deletedItemsProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to restore ${item.relativePath}: ${error}`);
		}
	});

	context.subscriptions.push(listDeletedCommand, restoreSelectedCommand, restoreItemCommand, treeView);
}

async function restoreItem(item: DeletedItem): Promise<void> {
	try {
		// Ensure the directory structure exists
		const targetDir = path.dirname(item.uri.fsPath);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDir));

		// Read backup content and restore file
		const backupContent = await vscode.workspace.fs.readFile(vscode.Uri.file(item.backupPath));
		await vscode.workspace.fs.writeFile(item.uri, backupContent);
		
		console.log(`Restored ${item.relativePath} from ${item.backupPath}`);
	} catch (error) {
		throw new Error(`Restoration failed: ${error}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
