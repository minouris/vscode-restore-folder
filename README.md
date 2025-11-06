# VS Code Restore Folder

A small VS Code extension that discovers deleted files and folders from VS Code local history and allows restoring them into the workspace.

This repository contains the extension source (TypeScript), focused unit tests (Mocha + Chai + Sinon), and test helpers to run the extension code under Node for fast unit testing.

## What's in the repo
- `src/` - TypeScript source files for the extension
- `src/test/` - Unit tests (Mocha + ts-node) with focused coverage across modules
- `test/helpers/vscode/` - Minimal `vscode` runtime stub used by tests (loaded via NODE_PATH)
- `package.json` - scripts and devDependencies used for build/test/package

## Development

Prerequisites: Node.js (16+ recommended), npm.

Install dependencies:

```bash
npm install
```

Build (TypeScript compile):

```bash
npm run compile
```

Note: TypeScript compilation is used for packaging. Unit tests run via ts-node and do not require a full `npm run compile` step during development.

## Running unit tests

Tests are written in TypeScript and run under Mocha + ts-node. The test runner uses a small `vscode` stub located in `test/helpers/vscode` so tests run in plain Node.

Run unit tests:

```bash
# use NODE_PATH so `require('vscode')` resolves to the test helper
NODE_PATH=./test/helpers mocha -r ts-node/register 'src/test/**/*.ts' --exit
```

Run coverage (c8):

```bash
NODE_PATH=./test/helpers c8 mocha -r ts-node/register 'src/test/**/*.ts'
```

Notes:
- Tests avoid touching your real filesystem when possible by using `mock-fs` or stubbing `FileSystemUtils`.
- Some tests set up fake workspace folders by assigning `vscode.workspace.workspaceFolders` to test values.

## Project structure & key modules

- `backup-scanner.ts` — discovers entries in VS Code local history and creates `DeletedItem` records.
- `deleted-items-provider.ts` — `TreeDataProvider` that exposes deleted items to the Explorer view.
- `item-organizer.ts` — organizes flat lists into a hierarchical tree.
- `file-restorer.ts` — logic to restore single files, empty directories, and recursively restore folders.
- `file-watcher-manager.ts` — creates `FileSystemWatcher` objects and performs debounced refreshes.
- `file-system-utils.ts` — small helpers wrapping fs operations and URI normalization.

## Packaging the extension (how to create a .vsix)

High-level steps to create a VSIX for the extension:

1. Ensure `package.json` has the correct `name`, `version`, `publisher`, `engines.vscode` and `activationEvents` fields.
2. Build/compile the TypeScript sources:

```bash
npm run compile
```

3. Install `vsce` if you don't have it (globally or use npx):

```bash
npx vsce package
```

This will produce a `.vsix` file which can be installed locally or published.

Publishing to the Marketplace requires a publisher account and credentials; see `vsce` docs for details.

Helpful packaging notes
- Make sure `out/extension.js` (the compiled extension entry) is listed in your `files`/`package.json` if you restrict published files.
- Prefer using `npx vsce package` (no global install required).
- If you want CI-based publishing, create a GitHub Action that runs `npm ci`, `npm run compile`, and `npx vsce publish --pat $VSCE_PAT` with a Personal Access Token stored in secrets.

## Troubleshooting tests
- If tests fail under Node complaining about `vscode` not found, ensure you run tests with the `NODE_PATH=./test/helpers` prefix so the `vscode` stub is resolved.
- If a test uses fake timers (sinon), ensure timers are restored in the test tear-down to avoid affecting other tests.

## Next steps and packaging help
If you'd like, I can:

- Prepare a small `package.json` packaging script (e.g. `npm run package` that runs `npm run compile && npx vsce package`).
- Add a CI workflow for building and optionally publishing the extension.
- Run a final audit to ensure the `package.json` extension manifest fields (publisher, name, displayName, repository, engines.vscode) are present and valid.

Tell me which of these you'd like to do next and I'll implement it.

---
README last updated: automated by test/coverage iteration
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
