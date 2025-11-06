const expect = require('chai').expect;
const mockFs = require('mock-fs');
import { FileSystemUtils } from '../file-system-utils';
import * as path from 'path';

describe('FileSystemUtils', () => {
  const expect = require('chai').expect;
  const mockFs = require('mock-fs');
  const FileSystemUtils = require('../file-system-utils').FileSystemUtils;
  const path = require('path');

  describe('FileSystemUtils', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('normalizeUriPath should decode file:// and vscode-remote URIs', () => {
      const fileUri = 'file:///home/test%20user/project/file.txt';
      const normalized = FileSystemUtils.normalizeUriPath(fileUri);
      expect(normalized).to.equal('/home/test user/project/file.txt');

      const remoteUri = 'vscode-remote://ssh-remote+host/home/test%20user/project/file.txt';
      const normalizedRemote = FileSystemUtils.normalizeUriPath(remoteUri);
      expect(normalizedRemote).to.equal('/home/test user/project/file.txt');
    });

    it('fileExists and readJsonFileSafe should behave as expected', () => {
      mockFs({
        '/tmp/config': {
          'good.json': '{"foo": 1}',
          'bad.json': 'not-json'
        }
      });

      expect(FileSystemUtils.fileExists('/tmp/config/good.json')).to.be.true;
      const json = FileSystemUtils.readJsonFileSafe('/tmp/config/good.json');
      expect(json).to.be.an('object');
      expect(json.foo).to.equal(1);

      const bad = FileSystemUtils.readJsonFileSafe('/tmp/config/bad.json');
      expect(bad).to.be.null;

      expect(FileSystemUtils.fileExists('/tmp/config/missing.json')).to.be.false;
    });
  });
    });
