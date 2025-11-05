# Local History Restore - VS Code Extension

A VS Code extension that helps you restore deleted files and folders from VS Code's local history. Never lose your work again!

## Features

- **List Deleted Items**: Scan your workspace to find files and folders that have been deleted but still exist in VS Code's local history
- **Multi-Select Restoration**: Select multiple items for batch restoration
- **Recursive Restoration**: Automatically restore entire folder structures
- **Most Recent Version**: Always restores the most recent version before deletion
- **Explorer Integration**: Convenient tree view in the Explorer sidebar

## Usage

### 1. List Deleted Files and Folders

- Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Run the command: `Local History Restore: List Deleted Files and Folders`
- The extension will scan your workspace and display deleted items in the Explorer sidebar

### 2. Restore Items

**Option A: From the Tree View**
1. Navigate to the "Deleted Items" view in the Explorer sidebar
2. Click the restore icon (📁) next to any item to restore it individually
3. Or select multiple items and use the context menu

**Option B: Using Commands**
1. After listing deleted items, use `Local History Restore: Restore Selected Items`
2. Confirm the restoration when prompted

## How It Works

The extension scans VS Code's local history and backup files to identify:
- Files that existed in your workspace but have been deleted
- The most recent backup versions of those files
- Folder structures that can be restored recursively

VS Code automatically creates backup files when you edit documents, and this extension leverages those backups to restore your deleted work.

## Requirements

- VS Code 1.105.0 or higher
- A workspace with files (the extension only works within workspaces)

## Limitations

- Can only restore files that were opened and edited in VS Code (and thus have backup files)
- Cannot restore files that were deleted outside of VS Code without being opened first
- Backup file locations may vary by operating system and VS Code installation

## Extension Commands

This extension contributes the following commands:

- `minouris-local-history-restore.listDeleted`: List Deleted Files and Folders
- `minouris-local-history-restore.restoreSelected`: Restore Selected Items
- `minouris-local-history-restore.restoreItem`: Restore Individual Item

## Development

To run this extension in development mode:

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile the TypeScript: `npm run compile`
4. Press `F5` to open a new Extension Development Host window
5. Test the extension in the new window

### Building

```bash
npm run compile
```

### Running Tests

```bash
npm test
```

## Release Notes

### 0.0.1

- Initial release
- Basic functionality to list and restore deleted files and folders
- Explorer tree view integration
- Multi-select restoration support

## Contributing

This extension is open source. Feel free to contribute by:
- Reporting bugs
- Suggesting new features  
- Submitting pull requests

## License

[MIT License](LICENSE)

---

**Note**: This extension works by scanning VS Code's internal backup and history files. The availability of deleted files depends on VS Code's backup mechanisms and may vary based on your settings and usage patterns.
