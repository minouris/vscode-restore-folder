import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PLATFORM_PATHS, URI_SCHEMES } from './constants';

/**
 * Utility functions for file system operations and path handling
 */
export class FileSystemUtils {
    
    /**
     * Gets the platform-specific global backup path for VS Code
     */
    static getGlobalBackupPath(): string | null {
        const platform = os.platform();
        const homedir = os.homedir();

        switch (platform) {
            case 'win32':
                return path.join(homedir, ...PLATFORM_PATHS.WIN32.CODE_USER_DATA, 'History');
            case 'darwin':
                return path.join(homedir, ...PLATFORM_PATHS.DARWIN.CODE_USER_DATA, 'History');
            default: // linux and others
                return path.join(homedir, ...PLATFORM_PATHS.LINUX.CODE_USER_DATA, 'History');
        }
    }

    /**
     * Gets all possible VS Code backup locations for the current platform
     */
    static getVSCodeBackupLocations(): string[] {
        const platform = os.platform();
        const homedir = os.homedir();
        const locations: string[] = [];

        switch (platform) {
            case 'linux':
                locations.push(
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.WORKSPACE_STORAGE),
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.GLOBAL_STORAGE),
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.CODE_USER_DATA, 'logs'),
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.CODE_USER_DATA, 'CachedExtensions'),
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.VSCODE_SERVER_HISTORY!),
                    path.join(homedir, ...PLATFORM_PATHS.LINUX.VSCODE_SERVER_WORKSPACE!)
                );
                break;
            case 'darwin':
                locations.push(
                    path.join(homedir, ...PLATFORM_PATHS.DARWIN.WORKSPACE_STORAGE),
                    path.join(homedir, ...PLATFORM_PATHS.DARWIN.GLOBAL_STORAGE)
                );
                break;
            case 'win32':
                locations.push(
                    path.join(homedir, ...PLATFORM_PATHS.WIN32.WORKSPACE_STORAGE),
                    path.join(homedir, ...PLATFORM_PATHS.WIN32.GLOBAL_STORAGE)
                );
                break;
        }

        return locations;
    }

    /**
     * Normalizes a URI by removing scheme prefixes and decoding
     */
    static normalizeUriPath(uriPath: string): string {
        let normalizedPath = uriPath;

        if (normalizedPath.startsWith(URI_SCHEMES.VSCODE_REMOTE)) {
            const match = normalizedPath.match(/vscode-remote:\/\/[^/]+(.+)$/);
            if (match) {
                normalizedPath = decodeURIComponent(match[1]);
            }
        } else if (normalizedPath.startsWith(URI_SCHEMES.FILE)) {
            normalizedPath = decodeURIComponent(normalizedPath.replace(URI_SCHEMES.FILE, ''));
        }

        return normalizedPath;
    }

    /**
     * Safely checks if a file exists without throwing
     */
    static fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    /**
     * Safely reads a directory without throwing
     */
    static readDirectorySafe(directoryPath: string): fs.Dirent[] {
        try {
            return fs.readdirSync(directoryPath, { withFileTypes: true });
        } catch {
            return [];
        }
    }

    /**
     * Safely reads a JSON file and parses it
     */
    static readJsonFileSafe<T>(filePath: string): T | null {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content) as T;
        } catch {
            return null;
        }
    }

    /**
     * Gets file stats safely without throwing
     */
    static getFileStatsSafe(filePath: string): fs.Stats | null {
        try {
            return fs.statSync(filePath);
        } catch {
            return null;
        }
    }

    /**
     * Checks if a path is within the given workspace directory
     */
    static isPathInWorkspace(filePath: string, workspacePath: string): boolean {
        return filePath.startsWith(workspacePath);
    }

    /**
     * Extracts the original file path from a backup file
     */
    static extractOriginalPathFromBackup(backupPath: string, workspacePath: string): string | null {
        try {
            const content = fs.readFileSync(backupPath, 'utf8');
            const lines = content.split('\n').slice(0, 10); // Check first 10 lines only
            
            for (const line of lines) {
                if (line.includes(URI_SCHEMES.FILE)) {
                    const match = line.match(/file:\/\/([^"'\s]+)/);
                    if (match) {
                        return decodeURIComponent(match[1]);
                    }
                }
            }
            
            // Fallback: construct path from backup structure
            const fileName = path.basename(path.dirname(backupPath));
            return path.join(workspacePath, fileName);
        } catch {
            return null;
        }
    }

    /**
     * Sorts backup files by modification time (newest first)
     */
    static sortBackupFilesByDate(backupDirectory: string, fileNames: string[]): string[] {
        return fileNames.sort((a, b) => {
            const statA = FileSystemUtils.getFileStatsSafe(path.join(backupDirectory, a));
            const statB = FileSystemUtils.getFileStatsSafe(path.join(backupDirectory, b));
            
            if (!statA || !statB) {return 0;}
            
            return statB.mtime.getTime() - statA.mtime.getTime();
        });
    }
}