# Contributing to Local History Restore

Thank you for your interest in contributing to the Local History Restore extension! This guide will help you get started with development.

## Development Setup

### Prerequisites

- Node.js 16+ (20 recommended)
- npm
- VS Code

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/minouris/vscode-restore-folder.git
cd vscode-restore-folder
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run compile
```

4. Open the project in VS Code and press `F5` to start debugging

## Project Structure

```
├── src/
│   ├── backup-scanner.ts           # Discovers deleted items from VS Code history
│   ├── deleted-items-provider.ts   # TreeDataProvider for Explorer view
│   ├── item-organizer.ts           # Organizes items into hierarchical structure
│   ├── file-restorer.ts            # Handles file/folder restoration logic
│   ├── file-watcher-manager.ts     # Manages file system watchers
│   ├── file-system-utils.ts        # File system operation helpers
│   ├── extension.ts                # Main extension entry point
│   └── test/                       # Unit tests
├── test/helpers/vscode/            # Minimal vscode stub for testing
├── package.json                    # Extension manifest
└── tsconfig.json                   # TypeScript configuration
```

## Development Workflow

### Compiling

The extension is written in TypeScript and must be compiled to JavaScript:

```bash
npm run compile
```

For continuous compilation during development:

```bash
npm run watch
```

**Note**: Unit tests run via ts-node and do not require compilation during development.

### Running Tests

This project uses Mocha + Chai + Sinon for testing. Tests run in Node.js using a minimal VS Code stub.

Run all unit tests:
```bash
npm run test:unit
# or with NODE_PATH explicitly:
NODE_PATH=./test/helpers mocha -r ts-node/register 'src/test/**/*.ts' --exit
```

Run tests with coverage:
```bash
npm run test:cov
# or:
NODE_PATH=./test/helpers c8 mocha -r ts-node/register 'src/test/**/*.ts'
```

### Testing Notes

- Tests use `mock-fs` to avoid touching the real filesystem
- The `test/helpers/vscode` directory provides a minimal VS Code API stub
- Tests set up fake workspace folders via `vscode.workspace.workspaceFolders`
- If tests fail with "vscode not found", ensure `NODE_PATH=./test/helpers` is set

### Linting

```bash
npm run lint
```

## Key Modules

### backup-scanner.ts
Discovers entries in VS Code's local history directory and creates `DeletedItem` records. Scans the backup directory structure and identifies files that no longer exist in the workspace.

### deleted-items-provider.ts
Implements `TreeDataProvider` to expose deleted items in the Explorer view. Manages tree state, refresh operations, and provides data to VS Code's tree view API.

### item-organizer.ts
Transforms flat lists of deleted items into a hierarchical tree structure, organizing files by their folder paths for better visualization.

### file-restorer.ts
Contains logic to restore files and folders:
- Single file restoration from backups
- Empty directory creation
- Recursive folder restoration with all contents

### file-watcher-manager.ts
Creates and manages `FileSystemWatcher` instances with debounced refresh capabilities. Monitors the workspace for file deletions and triggers view updates.

### file-system-utils.ts
Small helper utilities for:
- File system operations (reading, checking existence)
- URI normalization and path handling
- Cross-platform compatibility

## Building & Packaging

### Creating a VSIX Package

To package the extension for distribution:

```bash
npm run package
```

Or manually:
```bash
npm run compile
npx vsce package
```

This creates a `.vsix` file that can be:
- Installed locally in VS Code
- Published to the VS Code Marketplace
- Shared with others for testing

### Publishing

Publishing requires:
1. A Visual Studio Marketplace publisher account
2. A Personal Access Token (PAT)

To publish:
```bash
npx vsce publish --pat YOUR_PAT
```

For CI-based publishing, see the GitHub Actions workflow in `.github/workflows/`.

## Development Environment

### Devcontainer

The project includes a devcontainer configuration for development in containerized environments.

#### Corporate TLS/Proxy Setup

If developing behind a corporate proxy or TLS-intercepting proxy (e.g., Zscaler):

**Option 1: Build-time CA Installation**
1. Place CA certificate files in `.devcontainer/certs/`
2. Build the container - certificates are automatically installed

```bash
mkdir -p .devcontainer/certs
cp /path/to/corporate-ca.pem .devcontainer/certs/
docker build -f .devcontainer/Dockerfile -t vrf-devcontainer .
```

**Option 2: Runtime CA Installation**
1. Mount CA files from the host
2. The post-create script installs them automatically

#### Proxy Build Args

For HTTP/HTTPS proxy environments:

```bash
docker build --no-cache \
  --build-arg NODE_VERSION=20 \
  --build-arg HTTP_PROXY="http://proxy.company:8080" \
  --build-arg HTTPS_PROXY="http://proxy.company:8080" \
  -f .devcontainer/Dockerfile -t vrf-devcontainer .
```

## Troubleshooting

### Tests failing with "vscode not found"
Ensure tests are run with `NODE_PATH=./test/helpers` so the vscode stub is resolved.

### Fake timers not working
If using sinon fake timers, ensure they're properly restored in test teardown to avoid affecting other tests.

### TypeScript compilation errors
Run `npm install` to ensure all type definitions are installed, including `@types/vscode`, `@types/node`, and `@types/mocha`.

## Contribution Guidelines

### Code Style

- Follow TypeScript best practices
- Use strict type checking (already enabled in `tsconfig.json`)
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose
- Use descriptive variable and function names

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add/update tests as needed
5. Ensure all tests pass (`npm run test:unit`)
6. Ensure code compiles (`npm run compile`)
7. Run the linter (`npm run lint`)
8. Commit your changes with clear messages
9. Push to your fork
10. Open a Pull Request

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add support for remote workspaces`
- `fix: handle permission errors during restoration`
- `test: add coverage for edge cases in file-restorer`
- `docs: update README with new features`

## Testing Your Changes

Before submitting a PR:

1. **Unit Tests**: Ensure all tests pass
   ```bash
   npm run test:unit
   ```

2. **Integration Testing**: Test in a real VS Code instance
   - Press `F5` to launch Extension Development Host
   - Create/delete files and test restoration
   - Verify edge cases (permissions, nested folders, etc.)

3. **Cross-platform**: If possible, test on multiple OSes

## Getting Help

- Check existing [Issues](https://github.com/minouris/vscode-restore-folder/issues)
- Review [Pull Requests](https://github.com/minouris/vscode-restore-folder/pulls)
- Ask questions in new issues with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Local History Restore!
