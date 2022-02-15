'use strict';

const chai = require('chai');
var {assert} = chai;
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const U = require('../../test/mocha.test.util');

const { get, post, del } = U;

describe('TESTING PERMISSIONS', function () {
  const forbiddenStatusCodes = [403, 401];

  describe('Test basic unprivileged access', function() {

    ['unlogged', 'logged'].forEach((userStatus) => {

      const logged = userStatus === 'logged';

      it(`Disallows accessing a private project (${userStatus})`, async function () {
        const res = await get('/project/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows accessing a private project settings (${userStatus})`, async function () {
        const res = await get('/project/' + U.privateProjectTest.shortname + '/settings', logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows accessing a private project using JSON api (${userStatus})`, async function () {
        const res = await get('/project/json/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows updating a private project (${userStatus})`, async function () {
        const res = await post('/project/json/' + U.privateProjectTest.shortname, logged)
          .send({data: U.privateProjectTest});
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });

      it(`Disallows deleting a private project (${userStatus})`, async function () {
        const res = await del('/project/json/' + U.privateProjectTest.shortname, logged);
        assert.oneOf(res.statusCode, forbiddenStatusCodes);
      });
    });
  });


});
