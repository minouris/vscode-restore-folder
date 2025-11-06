const expect = require('chai').expect;
const sinon = require('sinon');

describe('DeletedItemsProvider', () => {
  let DeletedItemsProvider: any;
  let vscode: any;

  beforeEach(() => {
    vscode = require('vscode');
    // create a fake workspace folder
    vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace'), name: 'ws' }];

    // stub BackupScanner.scanAllBackupLocations to return a predictable item
    const BackupScanner = require('../backup-scanner').BackupScanner;
    sinon.stub(BackupScanner.prototype, 'scanAllBackupLocations').resolves({ items: [
      {
        uri: vscode.Uri.file('/workspace/a.txt'),
        relativePath: 'a.txt',
        isDirectory: false,
        deletionTime: new Date(),
        backupPath: '/backup/a.txt'
      }
    ], errors: [] });

    DeletedItemsProvider = require('../deleted-items-provider').DeletedItemsProvider;
  });

  afterEach(() => {
    sinon.restore();
    // reset workspace folders
    const vscode = require('vscode');
    vscode.workspace.workspaceFolders = [];
  });

  it('refresh loads deleted items and returns children', async () => {
    const provider = new DeletedItemsProvider();
    await provider.refresh();
    const children = await provider.getChildren();
    expect(children).to.be.an('array');
    expect(children.length).to.equal(1);
    const treeItem = provider.getTreeItem(children[0]);
    expect(treeItem.tooltip).to.include('Deleted:');
  });
});
