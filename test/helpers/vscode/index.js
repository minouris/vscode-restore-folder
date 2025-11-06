// Minimal vscode stub for unit tests (moved from node_modules)
const fs = require('fs');

const Uri = {
  file: (path) => ({ fsPath: path, toString() { return `file://${path}`; } }),
  parse: (s) => ({ fsPath: s.replace('file://', '') }),
};

const FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

const workspace = {
  workspaceFolders: [],
  fs: {
    readFile: async (uri) => {
      const p = uri.fsPath || uri;
      return fs.promises.readFile(p);
    },
    writeFile: async (uri, content) => {
      const p = uri.fsPath || uri;
      return fs.promises.writeFile(p, content);
    },
    stat: async (uri) => {
      const p = uri.fsPath || uri;
      const s = await fs.promises.stat(p);
      return { type: s.isFile() ? FileType.File : s.isDirectory() ? FileType.Directory : FileType.Unknown };
    },
    createDirectory: async (uri) => {
      const p = uri.fsPath || uri;
      return fs.promises.mkdir(p, { recursive: true });
    },
  },
  createFileSystemWatcher: (pattern) => {
    const listeners = { create: [], delete: [] };
    return {
      onDidCreate: (cb) => { listeners.create.push(cb); return { dispose: () => {} }; },
      onDidDelete: (cb) => { listeners.delete.push(cb); return { dispose: () => {} }; },
      dispose: () => {},
      emitCreate: (uri) => { listeners.create.forEach(fn => fn(uri)); },
      emitDelete: (uri) => { listeners.delete.forEach(fn => fn(uri)); }
    };
  }
};

const window = {
  showInformationMessage: async (msg) => { return undefined; },
  showErrorMessage: async (msg) => { return undefined; },
  showWarningMessage: async (msg) => { return undefined; },
};

const commands = {
  executeCommand: async () => undefined,
};

class ThemeIcon {
  constructor(id) { this.id = id; }
}
ThemeIcon.File = new ThemeIcon('file');
ThemeIcon.Folder = new ThemeIcon('folder');

class EventEmitter {
  constructor() { this._listeners = []; }
  get event() {
    return (callback) => {
      this._listeners.push(callback);
      return { dispose: () => { this._listeners = this._listeners.filter(l => l !== callback); } };
    };
  }
  fire(arg) { this._listeners.forEach(fn => fn(arg)); }
}

class RelativePattern {
  constructor(base, pattern) { this.base = base; this.pattern = pattern; }
}

const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
};

class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
    this.tooltip = undefined;
    this.description = undefined;
    this.contextValue = undefined;
    this.iconPath = undefined;
    this.resourceUri = undefined;
  }
}

module.exports = {
  Uri,
  workspace,
  window,
  commands,
  ThemeIcon,
  FileType,
  EventEmitter,
  RelativePattern,
  TreeItem,
  TreeItemCollapsibleState
};
