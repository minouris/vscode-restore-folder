const expect = require('chai').expect;
const constants = require('../constants');

describe('Constants', () => {
  it('should export expected constants', () => {
    expect(constants.REFRESH_DEBOUNCE_DELAY_MS).to.be.a('number');
    expect(constants.ENTRIES_JSON_FILENAME).to.equal('entries.json');
    expect(constants.TREE_ITEM_CONTEXTS).to.be.an('object');
    expect(constants.STATUS_INDICATORS).to.be.an('object');
  });
});
