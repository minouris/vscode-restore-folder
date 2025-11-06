const expect = require('chai').expect;
const mockFs = require('mock-fs');
const path = require('path');
const BackupScanner = require('../backup-scanner').BackupScanner;

describe('BackupScanner', () => {
  afterEach(() => mockFs.restore());

  it('should find deleted items from workspace history entries.json', async () => {
    const workspacePath = '/workspace';
    const historyDir = path.join(workspacePath, '.vscode', 'history', 'file-hash');

    // Create entries.json and a backup file
    mockFs({
      [historyDir]: {
        'entries.json': JSON.stringify({ resource: 'file:///workspace/deleted.txt' }),
        'backup-1': 'content'
      }
    });

    const scanner = new BackupScanner(workspacePath);
    const result = await scanner.scanAllBackupLocations();

    expect(result.items.length).to.equal(1);
    const item = result.items[0];
    expect(item.relativePath).to.equal('deleted.txt');
    expect(item.backupPath).to.be.a('string');
  });
});
