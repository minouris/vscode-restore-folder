const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const { FileRestorer } = require('../file-restorer');

describe('FileRestorer focused unit tests', () => {
  let sandbox: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('restoreFile rejects when readBackupContent fails', async () => {
    const item: any = {
      isDirectory: false,
      relativePath: 'a.txt',
      uri: vscode.Uri.file('/workspace/a.txt'),
      backupPath: '/backup/a.txt'
    };

    sandbox.stub(vscode.workspace.fs, 'readFile').rejects(new Error('read failed'));

    try {
      await FileRestorer.restoreItem(item);
      throw new Error('Expected restoreItem to reject');
    } catch (err: any) {
      expect(String(err)).to.match(/Failed to read backup file|read failed/);
    }
  });

  it('restoreFile rejects when writeFile fails', async () => {
    const item: any = {
      isDirectory: false,
      relativePath: 'b.txt',
      uri: vscode.Uri.file('/workspace/b.txt'),
      backupPath: '/backup/b.txt'
    };

    sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([1,2,3]));
    sandbox.stub(vscode.workspace.fs, 'writeFile').rejects(new Error('write failed'));

    try {
      await FileRestorer.restoreItem(item);
      throw new Error('Expected restoreItem to reject');
    } catch (err: any) {
      expect(String(err)).to.match(/write failed/);
    }
  });

  it('restoreFile succeeds even if opening the restored file fails', async () => {
    const item: any = {
      isDirectory: false,
      relativePath: 'c.txt',
      uri: vscode.Uri.file('/workspace/c.txt'),
      backupPath: '/backup/c.txt'
    };

    sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([4,5,6]));
    sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
    sandbox.stub(vscode.commands, 'executeCommand').rejects(new Error('open failed'));

  await FileRestorer.restoreItem(item);
  sinon.assert.calledOnce(vscode.commands.executeCommand);
  });

  it('restoreFile proceeds even if createDirectory throws (ensureDirectoryExists tolerant)', async () => {
    const item: any = {
      isDirectory: false,
      relativePath: 'd.txt',
      uri: vscode.Uri.file('/workspace/sub/d.txt'),
      backupPath: '/backup/d.txt'
    };

    sandbox.stub(vscode.workspace.fs, 'createDirectory').rejects(new Error('mkdir failed'));
    sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([7]));
    sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
    sandbox.stub(vscode.commands, 'executeCommand').resolves();

  await FileRestorer.restoreItem(item);
  });

  it('restoreFolder throws when any child fails to restore', async () => {
    const folder: any = {
      isDirectory: true,
      relativePath: 'myfolder',
      uri: vscode.Uri.file('/workspace/myfolder'),
      children: [
        { isDirectory: false, relativePath: 'ok.txt', uri: vscode.Uri.file('/workspace/myfolder/ok.txt'), backupPath: '/backup/ok.txt' },
        { isDirectory: false, relativePath: 'bad.txt', uri: vscode.Uri.file('/workspace/myfolder/bad.txt') /* missing backupPath */ }
      ]
    };

    // createDirectory for folders should succeed
    sandbox.stub(vscode.workspace.fs, 'createDirectory').resolves();
    // readFile for ok child should succeed
    sandbox.stub(vscode.workspace.fs, 'readFile').resolves(Uint8Array.from([9]));
    sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();

    try {
      await FileRestorer.restoreFolder(folder);
      throw new Error('Expected restoreFolder to reject');
    } catch (err: any) {
      expect(String(err)).to.match(/failed to restore/i);
    }
  });

  it('canRestoreItem and canRestoreFolder edge cases', () => {
    const fileNoBackup: any = { isDirectory: false, relativePath: 'x' };
    const dirEmpty: any = { isDirectory: true, children: [] };

    const r1 = FileRestorer.canRestoreItem(fileNoBackup);
    expect(r1.canRestore).to.equal(false);

    const r2 = FileRestorer.canRestoreFolder(dirEmpty);
    expect(r2.canRestore).to.equal(false);
  });
});
