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
	children?: DeletedItem[];
}

class DeletedItemsProvider implements vscode.TreeDataProvider<DeletedItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<DeletedItem | undefined | void> = new vscode.EventEmitter<DeletedItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<DeletedItem | undefined | void> = this._onDidChangeTreeData.event;

	private deletedItems: DeletedItem[] = [];
	private organizedItems: DeletedItem[] = [];

	refresh(): void {
		this.deletedItems = [];
		this.loadDeletedItems();
		this.organizeItemsByFolder();
		this._onDidChangeTreeData.fire();
	}

	private organizeItemsByFolder(): void {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
		const tree = new Map<string, DeletedItem>();
		const rootItems: DeletedItem[] = [];

		// First, create all necessary folder nodes
		const allPaths = new Set<string>();
		
		for (const item of this.deletedItems) {
			const dirPath = path.dirname(item.relativePath);
			
			if (dirPath === '.' || dirPath === '') {
				rootItems.push(item);
			} else {
				// Add all parent directories to the set
				let currentPath = dirPath;
				while (currentPath && currentPath !== '.' && currentPath !== '') {
					allPaths.add(currentPath);
					currentPath = path.dirname(currentPath);
				}
			}
		}

		// Create folder items for all directories
		for (const dirPath of allPaths) {
			if (!tree.has(dirPath)) {
				const folderItem: DeletedItem = {
					uri: vscode.Uri.file(path.join(workspaceRoot, dirPath)),
					relativePath: dirPath,
					isDirectory: true,
					deletionTime: new Date(0), // Will be updated later
					backupPath: '',
					children: []
				};
				tree.set(dirPath, folderItem);
			}
		}

		// Now organize files into their parent folders and update folder timestamps
		for (const item of this.deletedItems) {
			const dirPath = path.dirname(item.relativePath);
			
			if (dirPath === '.' || dirPath === '') {
				// File is in root - already added above
				continue;
			}

			const folderItem = tree.get(dirPath);
			if (folderItem && folderItem.children) {
				folderItem.children.push(item);
				
				// Update folder's deletion time to the latest file deletion
				if (item.deletionTime > folderItem.deletionTime) {
					folderItem.deletionTime = item.deletionTime;
				}
			}
		}

		// Build the tree hierarchy
		const topLevelItems: DeletedItem[] = [];

		// Add root files
		topLevelItems.push(...rootItems);

		// Add top-level folders (those that don't have a parent in our tree)
		for (const [folderPath, folderItem] of tree.entries()) {
			const parentPath = path.dirname(folderPath);
			const isTopLevel = parentPath === '.' || parentPath === '' || !tree.has(parentPath);
			
			if (isTopLevel) {
				// Sort children within folder
				if (folderItem.children) {
					folderItem.children.sort((a, b) => path.basename(a.relativePath).localeCompare(path.basename(b.relativePath)));
				}
				topLevelItems.push(folderItem);
			} else {
				// Add this folder as a child of its parent
				const parentFolder = tree.get(parentPath);
				if (parentFolder && parentFolder.children) {
					parentFolder.children.push(folderItem);
				}
			}
		}

		// Sort nested folders within their parents
		for (const folderItem of tree.values()) {
			if (folderItem.children) {
				folderItem.children.sort((a, b) => {
					// Folders first, then files
					if (a.isDirectory && !b.isDirectory) return -1;
					if (!a.isDirectory && b.isDirectory) return 1;
					
					const aName = a.isDirectory ? a.relativePath.split('/').pop() || '' : path.basename(a.relativePath);
					const bName = b.isDirectory ? b.relativePath.split('/').pop() || '' : path.basename(b.relativePath);
					return aName.localeCompare(bName);
				});
			}
		}

		// Sort top-level items
		this.organizedItems = topLevelItems.sort((a, b) => {
			// Folders first, then files
			if (a.isDirectory && !b.isDirectory) return -1;
			if (!a.isDirectory && b.isDirectory) return 1;
			
			const aName = a.isDirectory ? path.basename(a.relativePath) : path.basename(a.relativePath);
			const bName = b.isDirectory ? path.basename(b.relativePath) : path.basename(b.relativePath);
			return aName.localeCompare(bName);
		});
	}

	getTreeItem(element: DeletedItem): vscode.TreeItem {
		const displayName = element.isDirectory ? 
			path.basename(element.relativePath) || element.relativePath : 
			path.basename(element.relativePath);

		const treeItem = new vscode.TreeItem(
			displayName,
			element.isDirectory ? 
				vscode.TreeItemCollapsibleState.Expanded : 
				vscode.TreeItemCollapsibleState.None
		);

		if (element.isDirectory) {
			const fileCount = element.children?.length || 0;
			treeItem.tooltip = `Folder with ${fileCount} deleted file(s)\nLatest deletion: ${element.deletionTime.toLocaleString()}`;
			treeItem.description = `${fileCount} file(s)`;
			treeItem.contextValue = 'deletedFolder';
			treeItem.iconPath = vscode.ThemeIcon.Folder;
		} else {
			// Check if file actually exists (might explain red lines)
			const fileExists = fs.existsSync(element.uri.fsPath);
			const backupExists = fs.existsSync(element.backupPath);
			
			let status = '';
			if (fileExists) {
				status += ' (EXISTS - might not be truly deleted)';
			}
			if (!backupExists) {
				status += ' (BACKUP MISSING)';
			}
			
			treeItem.tooltip = `Deleted: ${element.deletionTime.toLocaleString()}\nPath: ${element.relativePath}\nBackup: ${element.backupPath}${status}`;
			treeItem.description = element.deletionTime.toLocaleDateString();
			treeItem.contextValue = 'deletedItem';
			
			// Only set resourceUri if file doesn't exist (to avoid confusion)
			if (!fileExists) {
				treeItem.resourceUri = element.uri;
			} else {
				// For files that still exist, use a generic file icon
				treeItem.iconPath = vscode.ThemeIcon.File;
			}
			
			// Mark problematic files
			if (fileExists || !backupExists) {
				treeItem.description = '⚠️ ' + (treeItem.description || '');
			}
		}

		return treeItem;
	}



	getChildren(element?: DeletedItem): Thenable<DeletedItem[]> {
		if (!element) {
			// Return top-level organized items
			return Promise.resolve(this.organizedItems);
		} else if (element.isDirectory && element.children) {
			// Return children of a folder
			return Promise.resolve(element.children);
		}
		return Promise.resolve([]);
	}

	getParent(element: DeletedItem): vscode.ProviderResult<DeletedItem> {
		return null;
	}

	private loadDeletedItems(): void {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			console.log('No workspace folders found');
			return;
		}

		console.log('Starting scan for deleted items...');
		for (const workspaceFolder of workspaceFolders) {
			console.log(`Scanning workspace folder: ${workspaceFolder.uri.fsPath}`);
			this.scanForBackupFiles(workspaceFolder.uri.fsPath);
		}
		console.log(`Scan complete. Found ${this.deletedItems.length} deleted items`);
	}

	private scanForBackupFiles(workspacePath: string): void {
		console.log(`Scanning for backup files in workspace: ${workspacePath}`);
		
		// VS Code stores backup files in the user data directory
		// We'll look for .vscode folder and local history
		const vscodeDir = path.join(workspacePath, '.vscode');
		const historyDir = path.join(vscodeDir, 'history');

		console.log(`Checking local history directory: ${historyDir}`);
		if (fs.existsSync(historyDir)) {
			console.log('Local history directory exists, scanning...');
			this.scanHistoryDirectory(historyDir, workspacePath);
		} else {
			console.log('Local history directory does not exist');
		}

		// Also check global backup location (varies by OS)
		const globalBackupPath = this.getGlobalBackupPath();
		console.log(`Checking global backup path: ${globalBackupPath}`);
		if (globalBackupPath && fs.existsSync(globalBackupPath)) {
			console.log('Global backup directory exists, scanning...');
			this.scanGlobalBackups(globalBackupPath, workspacePath);
		} else {
			console.log('Global backup directory does not exist or path is null');
		}

		// Let's also check for VS Code's actual backup locations
		this.scanVSCodeBackupLocations(workspacePath);
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

	private scanVSCodeBackupLocations(workspacePath: string): void {
		const os = require('os');
		const platform = os.platform();
		const homedir = os.homedir();

		// Common VS Code backup locations to check
		const possibleLocations = [];

		if (platform === 'linux') {
			possibleLocations.push(
				path.join(homedir, '.config', 'Code', 'User', 'workspaceStorage'),
				path.join(homedir, '.config', 'Code', 'User', 'globalStorage'),
				path.join(homedir, '.config', 'Code', 'logs'),
				path.join(homedir, '.config', 'Code', 'CachedExtensions'),
				path.join(homedir, '.vscode-server', 'data', 'User', 'History'),
				path.join(homedir, '.vscode-server', 'data', 'User', 'workspaceStorage')
			);
		} else if (platform === 'darwin') {
			possibleLocations.push(
				path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
				path.join(homedir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage')
			);
		} else if (platform === 'win32') {
			possibleLocations.push(
				path.join(homedir, 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage'),
				path.join(homedir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage')
			);
		}

		console.log('Checking possible VS Code backup locations:');
		for (const location of possibleLocations) {
			console.log(`  - ${location}: ${fs.existsSync(location) ? 'EXISTS' : 'NOT FOUND'}`);
			if (fs.existsSync(location)) {
				this.scanBackupDirectory(location, workspacePath);
			}
		}
	}

	private scanBackupDirectory(backupPath: string, workspacePath: string): void {
		try {
			console.log(`Scanning backup directory: ${backupPath}`);
			const entries = fs.readdirSync(backupPath, { withFileTypes: true });
			
			// Look for entries.json file which contains metadata
			const entriesJsonPath = path.join(backupPath, 'entries.json');
			if (fs.existsSync(entriesJsonPath)) {
				this.processEntriesJson(entriesJsonPath, backupPath, workspacePath);
			}
			
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const subPath = path.join(backupPath, entry.name);
					// Recursively scan subdirectories (but limit depth)
					if (backupPath.split(path.sep).length < 15) {
						this.scanBackupDirectory(subPath, workspacePath);
					}
				}
			}
		} catch (error) {
			console.error(`Error scanning backup directory ${backupPath}:`, error);
		}
	}

	private processEntriesJson(entriesJsonPath: string, backupPath: string, workspacePath: string): void {
		try {
			console.log(`Processing entries.json: ${entriesJsonPath}`);
			const entriesContent = fs.readFileSync(entriesJsonPath, 'utf8');
			const entries = JSON.parse(entriesContent);
			
			// Handle VS Code's entries.json format: { version: 1, resource: "path", entries: [...] }
			if (entries && entries.resource) {
				let originalPath = entries.resource;
				
				// Handle URI format (vscode-remote://, file://, etc.)
				if (originalPath.startsWith('vscode-remote://')) {
					// Extract the actual file path from vscode-remote:// URIs
					const match = originalPath.match(/vscode-remote:\/\/[^/]+(.+)$/);
					if (match) {
						originalPath = decodeURIComponent(match[1]);
					}
				} else if (originalPath.startsWith('file://')) {
					originalPath = decodeURIComponent(originalPath.replace('file://', ''));
				}
				
				console.log(`  Found backup entry for: ${originalPath}`);
				
				// Check if this file is within our workspace and doesn't exist anymore
				if (originalPath.startsWith(workspacePath) && !fs.existsSync(originalPath)) {
					const relativePath = path.relative(workspacePath, originalPath);
					console.log(`    -> File is deleted! Adding to deleted items: ${relativePath}`);
					
					// Find the most recent backup file for this entry
					const backupFiles = fs.readdirSync(backupPath, { withFileTypes: true })
						.filter(f => f.isFile() && f.name !== 'entries.json')
						.sort((a, b) => {
							const statA = fs.statSync(path.join(backupPath, a.name));
							const statB = fs.statSync(path.join(backupPath, b.name));
							return statB.mtime.getTime() - statA.mtime.getTime();
						});
					
					if (backupFiles.length > 0) {
						const newestBackupFile = backupFiles[0];
						const backupFilePath = path.join(backupPath, newestBackupFile.name);
						const stat = fs.statSync(backupFilePath);
						
						this.deletedItems.push({
							uri: vscode.Uri.file(originalPath),
							relativePath,
							isDirectory: false,
							deletionTime: stat.mtime,
							backupPath: backupFilePath
						});
						
						console.log(`    -> Added deleted item: ${relativePath} (backup: ${newestBackupFile.name})`);
					}
				} else if (originalPath.startsWith(workspacePath)) {
					console.log(`    -> File still exists, skipping: ${originalPath}`);
				} else {
					console.log(`    -> File not in current workspace, skipping: ${originalPath}`);
				}
			}
		} catch (error) {
			console.error(`Error processing entries.json ${entriesJsonPath}:`, error);
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

	// Auto-scan for deleted items when the extension activates
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		// Delay slightly to let VS Code finish loading
		setTimeout(() => {
			deletedItemsProvider.refresh();
		}, 1000);
	}

	// Auto-refresh when workspace folders change
	const workspaceFolderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			deletedItemsProvider.refresh();
		}
	});

	// Smart file deletion watcher with batching
	let refreshTimer: NodeJS.Timeout | null = null;
	let pendingRefresh = false;

	const refreshDelayed = () => {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
		}
		
		if (!pendingRefresh) {
			pendingRefresh = true;
			refreshTimer = setTimeout(() => {
				if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
					deletedItemsProvider.refresh();
				}
				pendingRefresh = false;
				refreshTimer = null;
			}, 500); // 500ms delay to batch multiple deletions
		}
	};

	// Watch for file deletions across all workspace folders
	const fileWatchers: vscode.FileSystemWatcher[] = [];
	
	const setupFileWatchers = () => {
		// Clean up existing watchers
		fileWatchers.forEach(watcher => watcher.dispose());
		fileWatchers.length = 0;

		if (vscode.workspace.workspaceFolders) {
			for (const folder of vscode.workspace.workspaceFolders) {
				// Create a watcher for all files in this workspace folder
				const pattern = new vscode.RelativePattern(folder, '**/*');
				const watcher = vscode.workspace.createFileSystemWatcher(pattern);
				
				// Listen for file deletions and changes
				watcher.onDidDelete((uri) => {
					console.log(`File deleted: ${uri.fsPath}`);
					refreshDelayed();
				});

				// Also listen for file changes that might affect our deleted items
				watcher.onDidCreate((uri) => {
					// File was created - might affect our deleted items list
					console.log(`File created: ${uri.fsPath}`);
					refreshDelayed();
				});

				fileWatchers.push(watcher);
			}
		}
	};

	// Set up initial watchers
	setupFileWatchers();

	// Re-setup watchers when workspace folders change
	const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
		setupFileWatchers();
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

		// Show the tree view - focus on our specific tree view
		vscode.commands.executeCommand('deletedItems.focus');
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
			if (item.isDirectory && item.children) {
				// Restore entire folder
				await restoreFolder(item);
				const fileCount = item.children.length;
				vscode.window.showInformationMessage(`Restored folder "${item.relativePath}" with ${fileCount} file(s)`);
			} else {
				// Restore individual file
				await restoreItem(item);
				vscode.window.showInformationMessage(`Restored ${item.relativePath}`);
			}
			deletedItemsProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to restore ${item.relativePath}: ${error}`);
		}
	});

	// Add specific command for restoring folders
	const restoreFolderCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreFolder', async (folderItem: DeletedItem) => {
		if (!folderItem.isDirectory || !folderItem.children) {
			vscode.window.showErrorMessage('Invalid folder selection');
			return;
		}

		const fileCount = folderItem.children.length;
		const confirmation = await vscode.window.showQuickPick(['Yes', 'No'], {
			placeHolder: `Restore entire folder "${folderItem.relativePath}" with ${fileCount} file(s)?`
		});

		if (confirmation !== 'Yes') {
			return;
		}

		try {
			await restoreFolder(folderItem);
			vscode.window.showInformationMessage(`Successfully restored folder "${folderItem.relativePath}" with ${fileCount} file(s)`);
			deletedItemsProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to restore folder "${folderItem.relativePath}": ${error}`);
		}
	});

	// Register disposables
	context.subscriptions.push(
		listDeletedCommand, 
		restoreSelectedCommand, 
		restoreItemCommand, 
		restoreFolderCommand, 
		treeView, 
		workspaceFolderWatcher,
		workspaceWatcher
	);

	// Add cleanup for dynamic resources
	context.subscriptions.push({
		dispose: () => {
			// Clean up timer
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
			}
			
			// Clean up file watchers
			fileWatchers.forEach(watcher => watcher.dispose());
			fileWatchers.length = 0;
		}
	});
}

async function restoreItem(item: DeletedItem): Promise<void> {
	try {
		if (item.isDirectory) {
			// For directories, just create the directory structure
			await vscode.workspace.fs.createDirectory(item.uri);
			console.log(`Created directory ${item.relativePath}`);
		} else {
			// Ensure the directory structure exists
			const targetDir = path.dirname(item.uri.fsPath);
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDir));

			// Read backup content and restore file
			const backupContent = await vscode.workspace.fs.readFile(vscode.Uri.file(item.backupPath));
			await vscode.workspace.fs.writeFile(item.uri, backupContent);
			
			console.log(`Restored file ${item.relativePath} from ${item.backupPath}`);
		}
	} catch (error) {
		throw new Error(`Restoration failed: ${error}`);
	}
}

async function restoreFolder(folderItem: DeletedItem): Promise<void> {
	if (!folderItem.isDirectory || !folderItem.children) {
		throw new Error('Invalid folder item');
	}

	let restored = 0;
	let failed = 0;

	// First, create the folder itself
	try {
		await restoreItem(folderItem);
		restored++;
	} catch (error) {
		console.error(`Failed to create folder ${folderItem.relativePath}:`, error);
		failed++;
	}

	// Then restore all child items
	for (const childItem of folderItem.children) {
		try {
			if (childItem.isDirectory && childItem.children) {
				// Recursively restore subdirectories
				await restoreFolder(childItem);
			} else {
				// Restore individual files
				await restoreItem(childItem);
			}
			restored++;
		} catch (error) {
			console.error(`Failed to restore ${childItem.relativePath}:`, error);
			failed++;
		}
	}

	if (failed > 0) {
		throw new Error(`Restored ${restored} items, but ${failed} items failed to restore`);
	}

	console.log(`Successfully restored folder "${folderItem.relativePath}" with ${restored} files`);
}

// This method is called when your extension is deactivated
export function deactivate() {}
