const expect = require('chai').expect;
const sinon = require('sinon');

describe('FileRestorer error paths', () => {
  const FileRestorer = require('../file-restorer').FileRestorer;
  const vscode = require('vscode');

  it('restoreFile throws when backupPath missing', async () => {
    const item = { isDirectory: false, backupPath: '', relativePath: 'a.txt', uri: vscode.Uri.file('/workspace/a.txt') };
    try {
      await FileRestorer.restoreItem(item);
      throw new Error('Expected to throw');
    } catch (err: any) {
      expect(err.message).to.include('No backup path');
    }
  });

  it('restoreFolder throws when invalid folder item', async () => {
    try {
      await FileRestorer.restoreFolder({ isDirectory: false } );
      throw new Error('Expected to throw');
    } catch (err: any) {
      expect(err.message).to.include('Invalid folder item');
    }
  });
});
