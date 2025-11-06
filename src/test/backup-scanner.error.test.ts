const { expect } = require('chai');
const sinon = require('sinon');
const { BackupScanner } = require('../backup-scanner');
const { FileSystemUtils } = require('../file-system-utils');

describe('BackupScanner error handling', () => {
  let sandbox: any;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  it('records errors when readDirectorySafe throws', async () => {
    const workspace = '/workspace';
    const scanner = new BackupScanner(workspace);

    sandbox.stub(FileSystemUtils, 'fileExists').returns(true);
    sandbox.stub(FileSystemUtils, 'readDirectorySafe').throws(new Error('boom'));

    try {
      await scanner.scanAllBackupLocations();
      throw new Error('expected scanAllBackupLocations to throw');
    } catch (err: any) {
      expect(String(err)).to.contain('boom');
    }
  });
});
