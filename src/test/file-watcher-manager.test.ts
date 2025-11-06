const expect = require('chai').expect;
const sinon = require('sinon');

describe('FileWatcherManager', () => {
  let FileWatcherManager: any;
  let vscode: any;

  beforeEach(() => {
    vscode = require('vscode');
    // add a workspace folder so watchers will be created
    vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace'), name: 'ws' }];
    FileWatcherManager = require('../file-watcher-manager').FileWatcherManager;
  });

  afterEach(() => {
    sinon.restore();
    const vscode = require('vscode');
    vscode.workspace.workspaceFolders = [];
  });

  it('schedules a debounced refresh when events occur', async () => {
    const refreshStub = sinon.stub().resolves();
    const manager = new FileWatcherManager(refreshStub);
  manager.setupFileWatchers();

  const watchers = manager.getWatchers();
    expect(watchers.length).to.be.greaterThan(0);
  // setup fake timers before emitting events so setTimeout is controlled
  const clock = sinon.useFakeTimers();

  // trigger create/delete on first watcher
  const w = watchers[0];
  // watchers created by stub expose emitCreate/emitDelete
  w.emitCreate(vscode.Uri.file('/workspace/newfile.txt'));

  // advance timers using fake clock
  clock.tick(require('../constants').REFRESH_DEBOUNCE_DELAY_MS + 20);

  // allow the scheduled refresh to run
  await Promise.resolve();
  expect(refreshStub.called).to.be.true;
  clock.restore();
  }).timeout(2000);
});
