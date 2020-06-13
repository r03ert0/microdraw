const assert = require('assert');

const mongoDbPath = process.env.MONGODB_TEST;
if (!mongoDbPath) { throw new Error(`MONGODB_TEST must be explicitly set to avoid overwriting production `); }

const db = require('../../app/db/db')(mongoDbPath);

describe('mocha works', () => {
  it('mocha works', () => {
    assert(true);
  });
});

describe('annotation saved by puppeteer can be retrieved', () => {
  after(() => {
    db.db.close();
  });
  it('works', (done) => {
    db.findAnnotations({
      user: 'anyone'
    }).then((annotations) => {
      annotations.forEach((a) => {
        const path = a && a.annotation && a.annotation.path;
        const {segments} = path[1];
        if (segments) {
          segments.forEach((s) => {
            assert(Array.isArray(s));
          });
        } else {
          assert(false);
        }
      });
      done();
    })
      .catch((e) => {
        console.log(e);
        done(e);
      });
  });
});
