const { expect } = require('chai');
const { FileWatcherManager } = require('../file-watcher-manager');
const vscode = require('vscode');

describe('FileWatcherManager timer cleanup', () => {
  afterEach(() => { const v = require('vscode'); v.workspace.workspaceFolders = []; });

  it('schedules and cancels timer via dispose', (done) => {
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'ws' }];

    let called = 0;
    const refresh = async () => { called++; };

    const manager = new FileWatcherManager(refresh);
    manager.setupFileWatchers();

    const watchers = manager.getWatchers();
    // trigger event to schedule a refresh
    watchers[0].emitCreate(vscode.Uri.file('/workspace/x'));

    // Immediately dispose to cancel timer
    manager.dispose();

    // Wait a bit to ensure timer would have fired if not canceled
    setTimeout(() => {
      try {
        expect(manager.getWatchers().length).to.equal(0);
        expect(called).to.equal(0);
        done();
      } catch (err) { done(err); }
    }, 700);
  }).timeout(2000);
});
