const U = require('../mocha.test.util');

// root-level before & after hooks

before(async () => {
  U.initResources();
});

after(async () => {
  U.closeResources();
});
