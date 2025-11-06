const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const { DeletedItemsProvider } = require('../deleted-items-provider');
const { FileSystemUtils } = require('../file-system-utils');
const { STATUS_INDICATORS } = require('../constants');

describe('DeletedItemsProvider more cases', () => {
  let sandbox: any;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); vscode.workspace.workspaceFolders = []; });

  it('file tooltip shows NO_BACKUP_PATH_SUFFIX when no backupPath', () => {
    const provider = new DeletedItemsProvider();
    const item = { isDirectory: false, relativePath: 'x.txt', uri: vscode.Uri.file('/workspace/x.txt'), deletionTime: new Date() };
    // file doesn't exist and no backupPath
    sandbox.stub(FileSystemUtils, 'fileExists').returns(false);

    const treeItem = provider.getTreeItem(item);
    expect(treeItem.tooltip).to.contain(STATUS_INDICATORS.NO_BACKUP_PATH_SUFFIX);
  });

  it('file tooltip shows BACKUP_MISSING_SUFFIX when backupPath present but missing on disk', () => {
    const provider = new DeletedItemsProvider();
    const item = { isDirectory: false, relativePath: 'y.txt', uri: vscode.Uri.file('/workspace/y.txt'), backupPath: '/backup/y.txt', deletionTime: new Date() };
    // file does not exist, backup missing
  sandbox.stub(FileSystemUtils, 'fileExists').callsFake((p: string) => false);

    const treeItem = provider.getTreeItem(item);
    expect(treeItem.tooltip).to.contain(STATUS_INDICATORS.BACKUP_MISSING_SUFFIX);
  });
});
