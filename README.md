# Local History Restore

Recover deleted files and folders from VS Code's local history with just a few clicks. Never lose your work again!

## ✨ Features

- **🔍 Auto-Discovery**: Automatically scans VS Code's local history to find your deleted files and folders
- **📁 Tree View Integration**: Browse deleted items in a convenient tree view right in the Explorer sidebar
- **⚡ Quick Restore**: Restore individual files, entire folders, or multiple selections with a single click
- **🔄 Real-Time Updates**: Automatically detects when files are deleted and updates the view
- **📊 Hierarchical Display**: Organizes deleted items by their original folder structure for easy navigation
- **💾 Smart Recovery**: Always restores the most recent version before deletion

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Local History Restore"
4. Click Install

### How to Use

#### View Deleted Items

The "Deleted Items" view appears automatically in the Explorer sidebar when you open a workspace. If you don't see it:

1. Open the Explorer sidebar (`Ctrl+Shift+E` / `Cmd+Shift+E`)
2. Look for the "Deleted Items" section
3. Click the refresh button to scan for deleted files

#### Restore Files and Folders

**Single Item:**
- Click the restore icon (➕) next to any deleted file or folder in the tree view

**Multiple Items:**
1. Select multiple items using `Ctrl+Click` / `Cmd+Click`
2. Right-click and choose "Restore Selected Items"

**From Command Palette:**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Local History Restore: Refresh" to scan for deleted items
3. Use the tree view to restore items

## 📋 Requirements

- **VS Code**: Version 1.105.0 or higher
- **Workspace**: Must have at least one workspace folder open
- **File History**: Only works with files that were previously opened and edited in VS Code

## 💡 How It Works

VS Code automatically creates backup copies of files as you edit them. This extension:

1. Scans VS Code's local history directory for backup files
2. Identifies which files have been deleted from your workspace
3. Displays them in an organized tree view
4. Allows you to restore them with their most recent content

**Note**: The extension can only recover files that VS Code has backed up. Files that were never opened in VS Code or were deleted before being saved cannot be recovered.

## ⚠️ Known Limitations

- Only files that were opened and edited in VS Code can be restored (files with backup history)
- Files deleted outside of VS Code that were never opened cannot be recovered
- Backup locations vary by operating system and VS Code installation
- Local history may be cleared by VS Code based on its internal retention policies

## 🎯 Extension Commands

This extension contributes the following commands:

| Command | Description |
|---------|-------------|
| `Local History Restore: Refresh` | Manually refresh the list of deleted items |
| `Restore Item` | Restore a single file (available in tree view context menu) |
| `Restore Folder` | Restore an entire folder with all its contents |

## 🆘 Troubleshooting

**No deleted items showing up?**
- Ensure you have a workspace folder open
- Click the refresh button in the "Deleted Items" view
- Verify that VS Code has created backups (check if files were edited in VS Code before deletion)

**Restore not working?**
- Check that you have write permissions in the target directory
- Ensure the file path is not too long for your operating system
- Try refreshing the view and attempting the restore again

## 📝 Release Notes

See the [CHANGELOG](CHANGELOG.md) for detailed release information.

### Version 1.0.0

- Initial release
- Automatic detection of deleted files and folders
- Tree view integration in Explorer sidebar
- Single and multi-item restoration
- Real-time file system monitoring
- Hierarchical folder organization

## 🤝 Contributing

Found a bug or have a feature request? Please visit our [GitHub repository](https://github.com/minouris/vscode-restore-folder) to:

- Report issues
- Suggest new features
- Submit pull requests
- View the source code

For developers interested in contributing, see the [CONTRIBUTING.md](CONTRIBUTING.md) guide in our repository.

## 📄 License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoy using Local History Restore?** Please consider leaving a rating and review! Your feedback helps improve the extension.
