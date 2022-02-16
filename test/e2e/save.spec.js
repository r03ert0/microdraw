const assert = require('assert');

const mongoDbPath = process.env.MONGODB_TEST;
if (!mongoDbPath) { throw new Error(`MONGODB_TEST must be explicitly set to avoid overwriting production `); }

const mockedExpress = {
  use: () => {},
  get: () => {},
  post: () => {},
  set: () => {}
};
const path = require('path');
const nwl = require('neuroweblab');
nwl.init({
  app: mockedExpress,
  dirname: path.join(__dirname, "/auth/"),
  MONGO_DB: process.env.MONGODB_TEST,
  usernameField: "username",
  usersCollection: "users",
  projectsCollection: "projects",
  annotationsCollection: "annotations"
});
const {db} = mockedExpress;

describe('mocha works', () => {
  it('mocha works', () => {
    assert(true);
  });
});

describe('annotation saved by puppeteer can be retrieved', () => {
  after(() => {
    db.mongoDB().close();
  });
  it('works', (done) => {
    db.findAnnotations({
      user: 'anyone'
    }).then((annotations) => {
      annotations.forEach((a) => {
        const path = a && a.annotation && a.annotation.path;
        const [, {segments}] = path;
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
