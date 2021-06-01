/* eslint-disable global-require */
/* eslint-disable no-undef */
const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const SESSION_SECRET = process.env.SESSION_SECRET || 'a mi no me gusta la sémola';


chai.use(chaiHttp);

const mongoDbPath = process.env.MONGODB_TEST;
if (!mongoDbPath) { throw new Error(`MONGODB_TEST must be explicitly set to avoid overwriting production `); }

const db = require('../db/db')(mongoDbPath);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.db = db;

const server = `localhost`;
const port = 3002;
const url = `${server}:${port}`;

describe('Mocha Started', () => {
  it('Mocha works properly', () => {
    assert.strictEqual(1, 1);
  });
});

describe('testing local.js', () => {
  before(() => {

    app.use(session({
      secret : SESSION_SECRET || 'temporary secret',
      resave : false,
      saveUninitialized : false
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    require('./local')(app);
    app.get('/', (req, res) => res.status(200));
    app.listen(port, () => console.log(`app listening at port ${port}`));
  });

  it(`app listening at port ${port} correctly`, (done) => {
    chai.request(url)
      .get('/')
      .end((err, res) => {
        console.error(err);
        res.should.have.status(200);
        done();
      });
  });

  it('inserts local user signup correctly', () => {
    chai.request(url)
      .post('/localSignup')
      .type('json')
      .send({
        username : 'bobjane',
        password : 'passinginterest'
      })
      .end((err, res) => {
        console.error(err);
        res.should.have.status(200);
      });
  });

  it('using correct username and password authenticates correctly', () => {
    chai.request(url)
      .post('/localLogin')
      .type('form')
      .send({
        username : 'bobjane',
        password : 'passinginterest'
      })
      .end((err, res) => {
        console.error(err);
        res.should.have.status(200);
      });
  });
});
