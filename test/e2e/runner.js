const U = require('../mocha.test.util');

// root-level before & after hooks

before(async () => {
  await U.initResources();
});

after(async () => {
  await U.closeResources();
});
