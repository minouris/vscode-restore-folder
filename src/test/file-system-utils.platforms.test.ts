const { expect } = require('chai');
const sinon = require('sinon');
const os = require('os');
const { FileSystemUtils } = require('../file-system-utils');

describe('FileSystemUtils platform-specific paths', () => {
  let sandbox: any;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => { sandbox.restore(); });

  it('returns win32 global backup path when platform is win32', () => {
    sandbox.stub(os, 'platform').returns('win32');
    const p = FileSystemUtils.getGlobalBackupPath();
    expect(p).to.be.a('string');
    expect(p.toLowerCase()).to.include('appdata');
  });

  it('returns darwin global backup path when platform is darwin', () => {
    sandbox.stub(os, 'platform').returns('darwin');
    const p = FileSystemUtils.getGlobalBackupPath();
    expect(p).to.be.a('string');
    expect(p).to.include('Application Support');
  });
});
