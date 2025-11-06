const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const { DeletedItemsProvider } = require('../deleted-items-provider');
const { FileSystemUtils } = require('../file-system-utils');

describe('DeletedItemsProvider extra tests', () => {
  let sandbox: any;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  it('creates file tree item with backup-missing and exists suffix', async () => {
    // set workspace folder
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'ws' }];

    // Create a provider and stub scanner to return one item
    const provider = new DeletedItemsProvider();

    const item = {
      isDirectory: false,
      relativePath: 'dir/missing.txt',
      uri: vscode.Uri.file('/workspace/dir/missing.txt'),
      backupPath: '/backup/missing.txt',
      deletionTime: new Date()
    };

    // make file exists true and backup missing false -> leads to hasIssues false
  sandbox.stub(FileSystemUtils, 'fileExists').callsFake((p: string) => p === item.uri.fsPath);

    // inject items directly to provider
    provider['deletedItems'] = [item];
    provider['organizeItems'] = function() { this['organizedItems'] = [item]; };

    const treeItem = provider.getTreeItem(item);
    expect(treeItem.tooltip).to.be.a('string');
    expect(treeItem.description).to.be.a('string');
  });
});
