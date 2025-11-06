const { expect } = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const { FileWatcherManager } = require('../file-watcher-manager');

describe.skip('FileWatcherManager extra tests', () => {
  it('schedules refresh on create and respects debounce', (done) => {
  let called = 0;
  const refresh = async () => { called++; };

    // set workspace folder
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'ws' }];

    const manager = new FileWatcherManager(refresh);
    manager.setupFileWatchers();

    const watchers = manager.getWatchers();
    expect(watchers.length).to.be.greaterThan(0);

    // Use fake timers to deterministically advance time for debounce
    const sinon = require('sinon');
    const clock = sinon.useFakeTimers();

    // emit two create events quickly; debounce should collapse them
    watchers[0].emitCreate(vscode.Uri.file('/workspace/new1.txt'));
    watchers[0].emitCreate(vscode.Uri.file('/workspace/new2.txt'));

    // advance timers using fake clock
    clock.tick(require('../constants').REFRESH_DEBOUNCE_DELAY_MS + 20);

    // allow scheduled refresh to run
    setImmediate(() => {
      try {
        expect(called).to.equal(1);
        clock.restore();
        manager.dispose();
        done();
      } catch (err) { clock.restore(); manager.dispose(); done(err); }
    });
  }).timeout(2000);
});
