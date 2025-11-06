const expect = require('chai').expect;
const sinon = require('sinon');

describe('DeletedItemsProvider edge cases', () => {
  const DeletedItemsProvider = require('../deleted-items-provider').DeletedItemsProvider;
  const vscode = require('vscode');

  afterEach(() => {
    const vs = require('vscode');
    vs.workspace.workspaceFolders = [];
    sinon.restore();
  });

  it('getChildren returns empty when no workspace folders', async () => {
    const provider = new DeletedItemsProvider();
    // ensure workspaceFolders is empty
    vscode.workspace.workspaceFolders = [];
    await provider.refresh();
    const children = await provider.getChildren();
    expect(children).to.be.an('array').that.is.empty;
  });

  it('analyzeFileStatus flags missing backup and existing file', async () => {
    // stub FileSystemUtils methods
    const fsUtils = require('../file-system-utils').FileSystemUtils;
  sinon.stub(fsUtils, 'fileExists').callsFake((p: any) => p === '/workspace/existing.txt');

    const provider = new DeletedItemsProvider();
    // set a workspace folder and items
    vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace'), name: 'ws' }];

    // stub scanner to return an item that has no backupPath
    const BackupScanner = require('../backup-scanner').BackupScanner;
    sinon.stub(BackupScanner.prototype, 'scanAllBackupLocations').resolves({ items: [
      { uri: vscode.Uri.file('/workspace/existing.txt'), relativePath: 'existing.txt', isDirectory: false, deletionTime: new Date(), backupPath: '' }
    ], errors: [] });

    await provider.refresh();
    const items = await provider.getChildren();
    expect(items).to.have.lengthOf(1);
    const ti = provider.getTreeItem(items[0]);
    expect(ti.tooltip).to.include('Backup: N/A');
  });
});
