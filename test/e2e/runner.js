const chai = require('chai');
var {assert, expect} = chai;
const U = require('../mocha.test.util');

// root-level before & after hooks

before(async function () {
  await U.insertProject(U.privateProjectTest);
  try {
    await U.agent.post('/localSignup')
      .send(U.testingCredentials)
      .timeout(1000); // FIXME: (in nwl)works but hangs indefinitely
  } catch(_e) {
    //
  }
  let res = await U.agent.post('/localLogin').redirects(0)
    .send(U.testingCredentials);
  expect(res).to.have.cookie('connect.sid');
  U.cookies = U.parseCookies(res.headers['set-cookie'][0]);

  res = await U.agent.get('/token');
  assert.exists(res.body.token);
  assert.isNotEmpty(res.body.token);
  U.token = res.body.token;
});

after(async function () {
  await U.agent.close();
  await U.removeProject(U.privateProjectTest.shortname);
  await U.removeUser(U.testingCredentials.username);
  process.exit(0);
});
