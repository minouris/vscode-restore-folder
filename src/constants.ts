/**
 * Application-wide constants for the VS Code Restore Folder extension
 * Centralizes all magic literals to improve maintainability and clarity
 */

// Timing constants (in milliseconds)
export const REFRESH_DEBOUNCE_DELAY_MS = 500;
export const INITIAL_ACTIVATION_DELAY_MS = 1000;

// File system constants
export const MAX_SCAN_DEPTH = 15;
export const ENTRIES_JSON_FILENAME = 'entries.json';

// Progress reporting
export const PROGRESS_COMPLETE_PERCENT = 100;

// UI constants
export const TOOLTIP_PREVIEW_LINES = 10;

// Platform-specific paths
export const PLATFORM_PATHS = {
    WIN32: {
        CODE_USER_DATA: ['AppData', 'Roaming', 'Code', 'User'],
        WORKSPACE_STORAGE: ['AppData', 'Roaming', 'Code', 'User', 'workspaceStorage'],
        GLOBAL_STORAGE: ['AppData', 'Roaming', 'Code', 'User', 'globalStorage']
    },
    DARWIN: {
        CODE_USER_DATA: ['Library', 'Application Support', 'Code', 'User'],
        WORKSPACE_STORAGE: ['Library', 'Application Support', 'Code', 'User', 'workspaceStorage'],
        GLOBAL_STORAGE: ['Library', 'Application Support', 'Code', 'User', 'globalStorage']
    },
    LINUX: {
        CODE_USER_DATA: ['.config', 'Code', 'User'],
        WORKSPACE_STORAGE: ['.config', 'Code', 'User', 'workspaceStorage'],
        GLOBAL_STORAGE: ['.config', 'Code', 'User', 'globalStorage'],
        VSCODE_SERVER_HISTORY: ['.vscode-server', 'data', 'User', 'History'],
        VSCODE_SERVER_WORKSPACE: ['.vscode-server', 'data', 'User', 'workspaceStorage']
    }
} as const;

// URI schemes
export const URI_SCHEMES = {
    FILE: 'file://',
    VSCODE_REMOTE: 'vscode-remote://'
} as const;

// VS Code backup directory names
export const BACKUP_DIRECTORIES = {
    VSCODE: '.vscode',
    HISTORY: 'history',
    LOGS: 'logs',
    CACHED_EXTENSIONS: 'CachedExtensions'
} as const;

// Tree item context values
export const TREE_ITEM_CONTEXTS = {
    DELETED_ITEM: 'deletedItem',
    DELETED_FOLDER: 'deletedFolder'
} as const;

// File status indicators
export const STATUS_INDICATORS = {
    WARNING: '⚠️ ',
    EXISTS_SUFFIX: ' (EXISTS - might not be truly deleted)',
    BACKUP_MISSING_SUFFIX: ' (BACKUP MISSING)',
    NO_BACKUP_PATH_SUFFIX: ' (NO BACKUP PATH)'
} as const;