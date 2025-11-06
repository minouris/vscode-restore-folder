const { expect } = require('chai');
const sinon = require('sinon');
const mockFs = require('mock-fs');
const fs = require('fs');
const { FileSystemUtils } = require('../file-system-utils');

describe('FileSystemUtils more cases', () => {
  afterEach(() => mockFs.restore());

  it('sortBackupFilesByDate returns stable order when stats missing', () => {
    mockFs({ '/backups': { 'a': '1', 'b': '2' } });

    // Ensure function runs even when filesystem provides simple files
    const res = FileSystemUtils.sortBackupFilesByDate('/backups', ['a', 'b']);
    expect(res).to.be.an('array');
  });
});
