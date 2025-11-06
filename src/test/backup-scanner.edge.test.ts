const expect = require('chai').expect;
const mockFs = require('mock-fs');
const path = require('path');

describe('BackupScanner edge cases', () => {
  const BackupScanner = require('../backup-scanner').BackupScanner;

  afterEach(() => mockFs.restore());

  it('returns empty when no history dir exists', async () => {
    const scanner = new BackupScanner('/workspace');
    const result = await scanner.scanAllBackupLocations();
    expect(result.items).to.be.an('array');
  });

  it('handles history folder with no backup files gracefully', async () => {
    // create history folder with entries.json but no backup files
    const historyDir = '/workspace/.vscode/history/file-hash';
    mockFs({
      [historyDir]: {
        'entries.json': JSON.stringify({ resource: 'file:///workspace/missing.txt' })
      }
    });

    const scanner = new BackupScanner('/workspace');
    const result = await scanner.scanAllBackupLocations();
    // entries.json exists but there are no backup files -> items should be empty
    expect(result.items).to.be.an('array');
    expect(result.items.length).to.equal(0);
  });
});
