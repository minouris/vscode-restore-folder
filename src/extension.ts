import * as vscode from 'vscode';
import { DeletedItemsProvider } from './deleted-items-provider';
import { FileWatcherManager } from './file-watcher-manager';
import { FileRestorer } from './file-restorer';
import { PROGRESS_COMPLETE_PERCENT, INITIAL_ACTIVATION_DELAY_MS } from './constants';

// Activation: wire up providers, watchers and commands using focused modules
export function activate(context: vscode.ExtensionContext) {
	console.log('Restore Folder extension is now active! (refactored)');

	const deletedItemsProvider = new DeletedItemsProvider();

	const treeView = vscode.window.createTreeView('deletedItems', {
		treeDataProvider: deletedItemsProvider,
		canSelectMany: true
	});

	// File watcher manager will trigger provider.refresh() when needed
	const fileWatcherManager = new FileWatcherManager(async () => {
		await deletedItemsProvider.refresh();
	});

	// Setup watchers immediately and when workspace folders change
	fileWatcherManager.setupFileWatchers();
	const workspaceFolderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
		fileWatcherManager.setupFileWatchers();
	});

	// Auto-scan shortly after activation to let VS Code finish loading
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		setTimeout(async () => {
			await deletedItemsProvider.refresh();
		}, INITIAL_ACTIVATION_DELAY_MS);
	}

	// Commands
	const listDeletedCommand = vscode.commands.registerCommand('minouris-local-history-restore.listDeleted', async () => {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Scanning for deleted files...',
			cancellable: false
		}, async (progress) => {
			await deletedItemsProvider.refresh();
			progress.report({ increment: PROGRESS_COMPLETE_PERCENT });
		});

		await vscode.commands.executeCommand('deletedItems.focus');
		vscode.window.showInformationMessage(`Found ${deletedItemsProvider.getSelectedItems().length} deleted items`);
	});

	const restoreSelectedCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreSelected', async () => {
		const selectedItems = treeView.selection;
		if (!selectedItems || selectedItems.length === 0) {
			vscode.window.showWarningMessage('No items selected for restoration');
			return;
		}

		const confirmation = await vscode.window.showQuickPick(['Yes', 'No'], {
			placeHolder: `Restore ${selectedItems.length} item(s)?`
		});

		if (confirmation !== 'Yes') {return;}

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Restoring files...',
			cancellable: false
		}, async (progress) => {
			let restored = 0;

			for (const item of selectedItems) {
				try {
					if (item.isDirectory) {
						await FileRestorer.restoreFolder(item);
					} else {
						await FileRestorer.restoreItem(item);
					}
					restored++;
					progress.report({ increment: (100 / selectedItems.length), message: `Restored ${item.relativePath}` });
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to restore ${item.relativePath}: ${error}`);
				}
			}

			vscode.window.showInformationMessage(`Successfully restored ${restored} item(s)`);
			await deletedItemsProvider.refresh();
		});
	});

	const restoreItemCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreItem', async (item: any) => {
		if (!item) {return;}

		try {
			if (item.isDirectory) {
				await FileRestorer.restoreFolder(item);
				const count = item.children?.length || 0;
				vscode.window.showInformationMessage(`Restored folder "${item.relativePath}" with ${count} file(s)`);
			} else {
				await FileRestorer.restoreItem(item);
				vscode.window.showInformationMessage(`Restored ${item.relativePath}`);
			}
			await deletedItemsProvider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to restore ${item.relativePath}: ${error}`);
		}
	});

	const restoreFolderCommand = vscode.commands.registerCommand('minouris-local-history-restore.restoreFolder', async (folderItem: any) => {
		if (!folderItem || !folderItem.isDirectory) {
			vscode.window.showErrorMessage('Invalid folder selection');
			return;
		}

		const count = folderItem.children?.length || 0;
		const confirmation = await vscode.window.showQuickPick(['Yes', 'No'], {
			placeHolder: `Restore entire folder "${folderItem.relativePath}" with ${count} file(s)?`
		});

		if (confirmation !== 'Yes') {return;}

		try {
			await FileRestorer.restoreFolder(folderItem);
			vscode.window.showInformationMessage(`Successfully restored folder "${folderItem.relativePath}" with ${count} file(s)`);
			await deletedItemsProvider.refresh();
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
		workspaceFolderWatcher
	);

	// Also include file watcher disposables
	fileWatcherManager.getWatchers().forEach(w => context.subscriptions.push(w));

	// Dispose file watcher manager on deactivate
	context.subscriptions.push({ dispose: () => fileWatcherManager.dispose() });
}

export function deactivate() {
	// nothing to clean up explicitly - disposables are managed via context.subscriptions
}
