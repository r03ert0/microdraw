/* eslint-disable max-statements */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const assert = require('assert');
const express = require('express');
const request = require('request');
const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;
const { authTokenMiddleware, getTokenEndPoint } = require('./token');

describe('mocha works', () => {
  it('mocha works property', () => {
    assert(true);
  });
});

describe('sinon works properly', () => {
  const stub = sinon.stub();
  it('works properly', () => {
    expect(stub.called).to.be.false;
    stub();
    expect(stub.called).to.be.true;
  });

  const promiseStub = sinon.stub();
  it('promises works properly', (done) => {
    expect(promiseStub.called).to.be.false;
    promiseStub.resolves('apple');
    promiseStub()
      .then((result) => {
        expect(result).to.be.equal('apple');
        done();
      })
      .catch((e) => {
        console.error(e);
        done('should not fail');
      });
  });
});

let _server;

const port = process.env.MOCHATEST_PORT || 10002;
const hostname = `http://localhost`;

const user = {
  username: 'bob101'
};

describe('if db is not define, reponses are as expected', () => {
  before(() => {
    const app = express();
    app.use(authTokenMiddleware);
    app.get('/token', getTokenEndPoint);
    _server = app.listen(port, () => console.log(`application listening on port ${port}`));
  });
  after(() => {
    if(_server) { _server.close(); }
  });
  it('if db not initialised, GET /token should turn 500', (done) => {

    request(`${hostname}:${port}/token`, (err, res /*, body*/) => {
      expect(err).to.be.null;
      expect(res).to.be.not.null;
      expect(res.statusCode).to.be.equal(500);
      done();
    });
  });
});

const generateToken = ({ token='token name', expiryDate=new Date(), username='bob' }) => ({
  token,
  expiryDate,
  username
});

const spy = sinon.spy((req, res) => {
  const {isTokenAuthenticated, tokenUsername} = req;
  res.status(200).json({isTokenAuthenticated, tokenUsername});
});

describe('get token when not logged in works as intended', () => {

  const addTokenFake = sinon.fake.resolves(generateToken({
    username: 'bob',
    token: 'bla bla'
  }));
  beforeEach(() => {
    spy.resetHistory();
  });
  before(() => {
    const app = express();
    app.db = {
      addToken: addTokenFake
    };
    app.use(authTokenMiddleware);
    app.get('/token', getTokenEndPoint);
    app.get('/spy', spy);
    app.get('/dummy', (req, res) => {
      const { isTokenAuthenticated, tokenUsername } = req;
      res.status(200).json({ isTokenAuthenticated, tokenUsername });
    });
    _server = app.listen(port, () => console.log(`application listening on port ${port}`));
  });

  after(() => {
    if (_server) { _server.close(); }
  });

  afterEach(() => {
    spy.resetHistory();
  });

  it('if not logged in, GET /token should return 401', (done) => {
    request(`${hostname}:${port}/token`, (err, res /*, body*/) => {
      expect(err).to.be.null;
      expect(res).to.be.not.null;
      expect(res.statusCode).to.be.equal(401);
      expect(addTokenFake.called).to.equal(false);
      done();
    });
  });

  it('if not logged in, middlewhare should not populate token properties', (done) => {
    request(`${hostname}:${port}/spy`, (err /*, res, body*/) => {
      if(err) {
        console.error(err);
      }

      assert(spy.called);
      const arg = spy.getCall(0);
      const [{isTokenAuthenticated, tokenUsername}] = arg.args;
      expect(Boolean(isTokenAuthenticated)).to.be.equal(false);
      expect(Boolean(tokenUsername)).to.be.equal(false);
      done();
    });
  });
});

describe('get token when logged in works as intended', () => {

  let setUserFlag = true;

  const addTokenStub = sinon.stub();
  addTokenStub.resolvesArg(0);

  const findTokenStub = sinon.stub();
  const expiredToken = generateToken({
    username: 'bob101',
    token: '101',
    expiryDate: new Date(new Date().getTime() - 1e6)
  });
  const unexpiredToken = generateToken({
    username: 'bob102',
    token: '102',
    expiryDate: new Date(new Date().getTime() + 1e6)
  });
  findTokenStub.onCall(0).resolves(unexpiredToken);
  findTokenStub.onCall(1).resolves(expiredToken);

  beforeEach(() => {
    findTokenStub.resetHistory();
    spy.resetHistory();
    setUserFlag = false;
  });

  before(() => {
    const app = express();
    app.db = {
      addToken: addTokenStub,
      findToken: findTokenStub
    };
    app.use((req, res, next) => {
      if (setUserFlag) {
        req.user = user;
      }
      next();
    });
    app.use(authTokenMiddleware);
    app.get('/token', getTokenEndPoint);
    app.get('/spy', spy);
    app.get('/dummy', (req, res) => {
      const { isTokenAuthenticated, tokenUsername } = req;
      res.status(200).json({ isTokenAuthenticated, tokenUsername });
    });
    _server = app.listen(port, () => console.log(`application listening on port ${port}`));
  });

  after(() => {
    if (_server) { _server.close(); }
  });

  it('if user is logged in, GET /token should return token', (done) => {
    setUserFlag = true;
    request(`${hostname}:${port}/token`, (err, res /*, body*/) => {
      expect(err).to.be.null;
      expect(res).to.be.not.null;
      expect(res.statusCode).to.be.equal(200);
      expect(addTokenStub.called).to.equal(true);
      done();
    });
  });

  it('unexpired token should grant user access', (done) => {

    expect(spy.called).to.be.equal(false);
    expect(findTokenStub.called).to.be.equal(false);
    request(`${hostname}:${port}/spy?token=${unexpiredToken.token}`, (err, res /*, body*/) => {
      expect(err).to.be.null;
      expect(findTokenStub.called).to.be.true;
      expect(res.statusCode).to.be.equal(200);
      assert(spy.called);
      const arg = spy.getCall(0);
      const [{isTokenAuthenticated, tokenUsername, user: theUser}] = arg.args;
      expect(isTokenAuthenticated).to.be.equal(true);
      expect(tokenUsername).to.be.equal('bob102');
      expect(theUser).to.be.deep.equal({ username: 'bob102' });
      done();
    });
  });

  it('expired token should reject user access with message', (done) => {
    expect(spy.called).to.be.equal(false);
    expect(findTokenStub.called).to.be.equal(false);

    /**
         * burn the first fn call, second one will return the expired token
         */
    findTokenStub();
    request(`${hostname}:${port}/spy?token=${expiredToken.token}`, (err, res /*, body*/) => {
      expect(err).to.be.null;
      expect(findTokenStub.called).to.be.true;
      expect(res.statusCode).to.be.equal(200);
      assert(spy.called);
      const arg = spy.getCall(0);
      const [{isTokenAuthenticated, tokenUsername, user: theUser}] = arg.args;
      expect(isTokenAuthenticated).to.be.equal(false);
      expect(tokenUsername).to.be.equal('bob101');
      expect(Boolean(theUser)).to.be.false;
      done();
    });
  });
});
