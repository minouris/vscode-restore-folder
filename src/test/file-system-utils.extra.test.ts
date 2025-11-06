const expect = require('chai').expect;
const mockFs = require('mock-fs');
const FileSystemUtils = require('../file-system-utils').FileSystemUtils;

describe('FileSystemUtils extras', () => {
  afterEach(() => mockFs.restore());

  it('extractOriginalPathFromBackup falls back to directory name when content missing', () => {
    const workspacePath = '/workspace';
    const backupPath = '/workspace/.vscode/history/file-hash/snapshot';

    mockFs({
      [backupPath]: {
        'data': 'some binary-like content without file uri'
      }
    });
    const result = FileSystemUtils.extractOriginalPathFromBackup(pathJoin(backupPath, 'data'), workspacePath);
    expect(result).to.be.a('string');
    expect(result.startsWith(workspacePath)).to.be.true;
  });

  it('sortBackupFilesByDate orders newest first', () => {
    const dir = '/backups';
    mockFs({ [dir]: { 'a': 'a', 'b': 'b' } });

    // stub getFileStatsSafe to simulate mtimes
    const FileSystemUtilsClass = require('../file-system-utils').FileSystemUtils;
    const sinon = require('sinon');
    const now = Date.now();
    sinon.stub(FileSystemUtilsClass, 'getFileStatsSafe').callsFake((p: string) => {
      if (p.endsWith('a')) return { mtime: new Date(now - 1000) };
      if (p.endsWith('b')) return { mtime: new Date(now) };
      return null;
    });

    const sorted = FileSystemUtils.sortBackupFilesByDate(dir, ['a', 'b']);
    expect(sorted[0]).to.equal('b');
  });
});

function pathJoin(...args: string[]) { return Array.prototype.join.call(args, require('path').sep); }
