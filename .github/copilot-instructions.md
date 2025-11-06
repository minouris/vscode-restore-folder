# VS Code Restore Folder Extension - Copilot Instructions

## Project Overview

This is a VS Code extension that allows users to restore deleted files and folders from VS Code's local history. The extension provides a custom tree view in the Explorer sidebar for browsing and restoring deleted items with support for individual files, entire folders, and multi-select operations.

## Architecture & Technology Stack

### Core Technologies
- **TypeScript**: Main development language with strict type checking
- **VS Code Extension API**: Built using VS Code's extensibility framework (v1.105.0+)
- **Node.js**: Runtime environment for filesystem operations
- **npm**: Package management and build system

### Key Components
- **DeletedItemsProvider**: Main tree data provider implementing `vscode.TreeDataProvider<DeletedItem>`
- **DeletedItem Interface**: Type definition for deleted file/folder metadata with native API support
- **Hybrid Discovery**: Filesystem scanning with preparation for native VS Code API integration
- **File System Watchers**: Real-time monitoring of file deletions with 500ms batched refresh

## Project Structure

```
├── .github/                    # GitHub configuration and workflows
│   └── copilot-instructions.md # This file - Copilot development guidelines
├── src/
│   └── extension.ts           # Main extension source code (1000+ lines)
├── package.json              # Extension manifest with commands, views, and menus
├── tsconfig.json            # TypeScript configuration
├── README.md               # User documentation
└── .gitignore             # Git ignore rules
```

## Key Features & Functionality

### Core Features
1. **Auto-Discovery**: Scans VS Code's local history (`~/.vscode-server/data/User/History`)
2. **Hierarchical Display**: Organizes deleted items by folder structure with collapsible tree
3. **Multi-Restoration**: Individual files, entire folders, or multiple selections
4. **Real-time Monitoring**: Auto-detects deletions and refreshes view (debounced 500ms)
5. **Smart Restoration**: Handles directory creation and content recovery from backups

### UI Components
- **Explorer Integration**: "Deleted Items" view in Explorer sidebar with conditional visibility
- **Context Menus**: Right-click restore options for files and folders
- **Progress Indicators**: Visual feedback during restoration operations
- **Enhanced Tooltips**: Show file status, backup paths, and warning indicators
- **Single Refresh Button**: Clean UI with one "Refresh" action button

## Implementation Details

### DeletedItem Interface
```typescript
interface DeletedItem {
    uri: vscode.Uri;
    relativePath: string;
    isDirectory: boolean;
    deletionTime: Date;
    backupPath?: string;
    children?: DeletedItem[];
    nativeHistoryEntry?: {        // Future native API support
        uri: vscode.Uri;
        handle: string;
    };
}
```

### File System Integration
- **Backup Discovery**: Parses VS Code's `entries.json` files in history directories
- **URI Handling**: Supports `file://`, `vscode-remote://` URI formats
- **Validation**: Checks file existence to identify truly deleted items
- **Restoration**: Uses VS Code FileSystem API for atomic operations

### Real-time Monitoring
- **FileSystemWatcher**: Monitors workspace for deletions
- **Debounced Refresh**: 500ms batching to handle rapid multiple deletions
- **Auto-activation**: Loads on `onStartupFinished` event
- **Workspace Changes**: Responds to workspace folder changes

## Development Guidelines

### Code Style & Standards
- **Strict TypeScript**: Full type annotations and compile-time checking
- **VS Code Patterns**: Follow official extension development best practices
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Async/Await**: Consistent asynchronous operation patterns
- **Resource Cleanup**: Proper disposal of watchers and resources
- **Single Responsibility**: Modular functions and files with clear purposes. No function should do more than its name suggests.
- **Separation of Concerns**: Distinct layers for UI, data handling, and filesystem operations
- **Divide Concerns by File**: Group related functionalities into separate files
- **Clear Naming Conventions**: Descriptive names for variables, functions, and classes
- **Precise Naming**: Use clear and descriptive names for variables, functions, and classes
- **Least Surprise Principle**: Code should behave in a way that least surprises other developers
- **Least Surprise Naming**: Choose names that clearly convey purpose and behavior. 
- **Short Methods**: Keep functions concise and focused on a single task
- **Breakout Methods**: Avoid deeply nested code by breaking out logic into helper functions
- **Avoid Nested Logic**: Strive for flat code structures to enhance readability
- **Early Exits**: Use guard clauses to reduce nesting and improve clarity
- **Constants for Literals**: Define constants for any literal values used in the code

### Performance Considerations
- **Batched Operations**: Group file operations to avoid system overload
- **Lazy Loading**: Efficient tree view rendering and folder organization
- **Debounced Watchers**: Prevent excessive refresh operations
- **Fallback Mechanisms**: Graceful degradation when APIs fail

### Testing Areas
- File and folder deletion detection accuracy
- Restoration completeness and directory structure preservation
- UI responsiveness with large numbers of deleted items
- Edge cases: permissions, corrupted backups, nested folders
- Real-time monitoring reliability

## Extension Configuration

### Commands (package.json)
```json
{
  "command": "minouris-local-history-restore.listDeleted",
  "title": "Refresh",
  "icon": "$(refresh)"
}
```

### Views Integration
- **Container**: Explorer sidebar
- **Conditional Visibility**: `workspaceFolderCount > 0`
- **Context Menus**: File and folder restoration actions
- **Tree Item Types**: `deletedItem` and `deletedFolder`

### Activation Events
- **Primary**: `onStartupFinished` - Auto-loads after VS Code startup
- **Scope**: Workspace-dependent functionality

## Hybrid Native API Approach

### Current Implementation
- **Filesystem Scanning**: Proven backup detection and restoration
- **Native API Preparation**: Ready for future VS Code API integration
- **Fallback Strategy**: Multiple discovery methods ensure reliability

### Future Enhancement Opportunities
- **IWorkingCopyHistoryService**: Direct integration when API becomes available
- **Timeline Integration**: Enhanced discovery through VS Code's Timeline API
- **Native Restoration Commands**: Use `workbench.action.localHistory.restore`

## Common Development Patterns

### Proper Error Handling
```typescript
try {
    await vscode.workspace.fs.writeFile(targetUri, backupContent);
    console.log(`Restored ${relativePath}`);
    await deletedItemsProvider.refresh();  // Always await async refresh
} catch (error) {
    throw new Error(`Restoration failed: ${error}`);
}
```

### Resource Management
```typescript
context.subscriptions.push(
    fileWatcher,
    treeView,
    command
);
// Ensures proper cleanup on extension deactivation
```

### User Feedback Patterns
```typescript
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Restoring files...",
    cancellable: false
}, async (progress) => {
    // Restoration operations with progress updates
});
```

## Troubleshooting Guide

### Common Issues
1. **No Items Detected**: Check VS Code local history location and permissions
2. **Restoration Failures**: Verify target directory permissions and file conflicts
3. **Performance Issues**: Monitor file watcher efficiency and batching
4. **UI Not Updating**: Ensure async refresh calls use proper await patterns

### Debugging Tools
- **Console Logging**: Comprehensive logging throughout discovery and restoration
- **Error Messages**: User-friendly notifications with technical details in logs
- **Tooltip Debugging**: Enhanced tooltips show file status and backup validation

## Security & Privacy

### File System Access
- **Restricted Scope**: Only accesses VS Code's designated backup directories
- **Path Validation**: Sanitizes file paths to prevent directory traversal
- **Permission Handling**: Graceful degradation for permission errors
- **Data Privacy**: No logging of sensitive file contents

## Build & Distribution

### Development Commands
```bash
npm run compile    # TypeScript compilation
npm run watch      # Development mode with auto-compilation
```

### Extension Packaging
- **Output**: `out/extension.js` (compiled TypeScript)
- **Packaging**: Use `vsce package` to create `.vsix`
- **Testing**: Install and test packaged extension before distribution

## Contributing Guidelines

When working on this extension:

1. **Preserve Functionality**: Maintain backward compatibility with existing features
2. **Follow Patterns**: Use established code patterns and TypeScript conventions
3. **Test Thoroughly**: Verify file detection, restoration, and UI responsiveness
4. **Document Changes**: Update README and inline comments
5. **Performance First**: Consider impact on large workspaces and file counts

---

This extension provides essential file recovery functionality for VS Code users through an intuitive, high-performance interface that integrates seamlessly with VS Code's Explorer sidebar.