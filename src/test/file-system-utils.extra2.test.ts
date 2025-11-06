const { expect } = require('chai');
const fs = require('fs');
const mockFs = require('mock-fs');
const { FileSystemUtils } = require('../file-system-utils');

describe('FileSystemUtils additional tests', () => {
  afterEach(() => mockFs.restore());

  it('readJsonFileSafe returns null for invalid JSON', () => {
    mockFs({ '/tmp/bad.json': '{ notvalid json' });
    const res = FileSystemUtils.readJsonFileSafe('/tmp/bad.json');
    expect(res).to.equal(null);
  });

  it('extractOriginalPathFromBackup parses file:// URI from content', () => {
    const content = 'some header\nfile:///workspace/some/path.txt\nrest';
    mockFs({ '/tmp/backup1': content });
    const res = FileSystemUtils.extractOriginalPathFromBackup('/tmp/backup1', '/workspace');
    expect(res).to.equal('/workspace/some/path.txt');
  });

  it('getFileStatsSafe returns null for non-existent path', () => {
    const res = FileSystemUtils.getFileStatsSafe('/path/does/not/exist');
    expect(res).to.equal(null);
  });
});
