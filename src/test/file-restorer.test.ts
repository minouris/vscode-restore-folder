const expect = require('chai').expect;
const sinon = require('sinon');

describe('FileRestorer', () => {
  let FileRestorer: any;
  let vscode: any;
  let writeSpy: any;
  let execSpy: any;

  beforeEach(() => {
    // require the vscode stub and target module
    vscode = require('vscode');
    // spy on workspace fs write and commands
    writeSpy = sinon.stub(vscode.workspace.fs, 'writeFile').callsFake(async (uri: any, content: any) => {
      // store to a simple map on workspace for assertions
      vscode._written = vscode._written || {};
      vscode._written[uri.fsPath] = Buffer.from(content).toString();
    });

    execSpy = sinon.stub(vscode.commands, 'executeCommand').resolves();

    // load FileRestorer after stubbing
    FileRestorer = require('../file-restorer').FileRestorer;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('canRestoreItem returns false if no backupPath for file', () => {
    const item = { isDirectory: false, backupPath: '', relativePath: 'a.txt' };
    const result = FileRestorer.canRestoreItem(item);
    expect(result.canRestore).to.be.false;
    expect(result.reason).to.include('No backup path');
  });

  it('restoreItem writes file content and attempts to open it', async () => {
    const item = {
      isDirectory: false,
      backupPath: '/some/backup/path',
      relativePath: 'a.txt',
      uri: vscode.Uri.file('/workspace/a.txt'),
      deletionTime: new Date()
    };

    // stub readBackupContent to avoid fs dependencies
    sinon.stub(FileRestorer as any, 'readBackupContent').resolves(Buffer.from('hello'));

    await FileRestorer.restoreItem(item);

    expect(writeSpy.calledOnce).to.be.true;
    expect(vscode._written['/workspace/a.txt']).to.equal('hello');
    expect(execSpy.called).to.be.true;
  });

  it('canRestoreFolder validates folder with children', () => {
    const folder = { isDirectory: true, children: [{ isDirectory: false, backupPath: '/b' }] };
    const result = FileRestorer.canRestoreFolder(folder);
    expect(result.canRestore).to.be.true;
  });
});
