const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const { FileRestorer } = require('../file-restorer');

describe('FileRestorer more cases', () => {
  let sandbox: any;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => sandbox.restore());

  it('restoreEmptyDirectory creates directory', async () => {
    const item: any = { isDirectory: true, relativePath: 'newdir', uri: vscode.Uri.file('/workspace/newdir') };
    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    await FileRestorer.restoreItem(item);
  });

  it('restoreFolderContents handles nested success path', async () => {
    const folder: any = {
      isDirectory: true,
      relativePath: 'root',
      uri: vscode.Uri.file('/workspace/root'),
      children: [
        { isDirectory: false, relativePath: 'a.txt', uri: vscode.Uri.file('/workspace/root/a.txt'), backupPath: '/b/a.txt' },
        { isDirectory: false, relativePath: 'b.txt', uri: vscode.Uri.file('/workspace/root/b.txt'), backupPath: '/b/b.txt' }
      ]
    };

    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([1]));
    sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
    sandbox.stub(vscode.commands, 'executeCommand').resolves();

    await FileRestorer.restoreFolder(folder);
  });
});
