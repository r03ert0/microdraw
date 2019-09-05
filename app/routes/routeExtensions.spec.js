const assert = require('assert');
const chai = require('chai');
const nock = require('nock');
const request = require('request');
const {expect} = chai;

const express = require('express');
const app = express();
require('./routesExtensions')(app);

const nockMockUrl = 'http://nock-mock-url.me:3000';
const mockReplyJson1 = {
    key1 : 'value1',
    key2 : 'value2'
};
const mockReplyJson2 = {
    tileSources : [
        'http://test1.me/test1.dzi',
        'http://test2.me/test2.dzi'
    ]
};

const mockReplyJson2_augmented = {
    tileSources : [
        'http://test1.me/test1.dzi',
        'http://test2.me/test2.dzi'
    ]
};

const mockReplyJson3 = {
    tileSources : [
        '/test1.dzi',
        '/test2.dzi'
    ]
};

const mockReplyJson3_augmented = {
    tileSources : [
        `http://localhost:10002/getTile?source=${nockMockUrl}/test1.dzi`,
        `http://localhost:10002/getTile?source=${nockMockUrl}/test2.dzi`
    ]
};

const imageData = `random data here`;

const nockProxy = nock(nockMockUrl).persist();
nockProxy.get('/').reply(200);
nockProxy.get('/1.json').reply(200, mockReplyJson1);
nockProxy.get('/2.json').reply(200, mockReplyJson2);
nockProxy.get('/3.json').reply(200, mockReplyJson3);
nockProxy.get('/nonexistent.json').reply(400, mockReplyJson1);
nockProxy.get('/error.json').replyWithError({
    message: 'error message',
    code: 'error_code'
});

nockProxy.get('/test.jpg').reply(200, imageData);

describe('Mocha started', () => {
    it('now testing routeExtensions.spec', () => {
        assert.equal(1, 1);
    });
});

describe('nock setup correctly', () => {
    it('fetches nock server correctly', (done) => {
        request(nockMockUrl, (err, res, body) => {
            expect(err).to.be.equal(null);
            expect(res.statusCode).to.be.equals(200);
            done();
        });
    });
});

let _server;

describe('Test /getJson api end point', () => {

    before(() => {

        app.get('/', (_req, res) => res.status(200).send('ok'));
        _server = app.listen(10002, () => console.log('mocha test listening on port 10002'));
    });

    after(() => {
        _server.close();
    });

    it('fetches / correctly', (done) => {
        request('http://localhost:10002/', (err, res, body) => {
            expect(err).to.be.equals(null);
            expect(res.statusCode).to.be.equals(200);
            expect(body).to.equal('ok');
            done();
        });
    });

    it('endpoint /getJson exists', (done) => {
        request('http://localhost:10002/getJson', (err, res, body) => {
            expect(err).to.be.equal(null);
            expect(res.statusCode).to.be.equal(404);
            done();
        });
    });

    describe('endpoint /getJson fetches existing endpoint correctly', () => {

        it('error status code forwards the result onwards', (done) => {
            request(`http://localhost:10002/getJson?source=${nockMockUrl}/nonexistent.json`, (err, res, body) => {
                expect(err).to.be.equal(null);
                expect(res.statusCode).to.be.equal(404);
                done();
            });
        });

        it('illformed json returns 404', (done) => {
            request(`http://localhost:10002/getJson?source=${nockMockUrl}/1.json`, (err, res, body) => {
                expect(err).to.be.equal(null);
                expect(res.statusCode).to.be.equal(404);
                done();
            });
        });

        it('sometimes foreign server returns error (resp arg is undefined)', (done) => {
            request(`http://localhost:10002/getJson?source=${nockMockUrl}/error.json`, (err, res, body) => {
                expect(err).to.be.equal(null);
                expect(res.statusCode).to.be.equal(404);
                done();
            });
        });

        describe('correctly formed json returns json with tileSources field correctly augmented', () => {
            it('http protocol tileSources augmented correctly', (done) => {
                request(`http://localhost:10002/getJson?source=${nockMockUrl}/2.json`, (err, res, body) => {
                    expect(err).to.be.equal(null);
                    expect(res.statusCode).to.be.equal(200);
                    expect(JSON.parse(body)).to.be.deep.equal(mockReplyJson2_augmented);
                    done();
                });
            });

            /*
            it('http protocol tileSources augmented correctly when data are in the same server', (done) => {
                request(`http://localhost:10002/getJson?source=/2.json`, (err, res, body) => {
                    expect(err).to.be.equal(null);
                    expect(res.statusCode).to.be.equal(200);
                    expect(JSON.parse(body)).to.be.deep.equal(mockReplyJson2_augmented);
                    done();
                });
            });
            */

            it('absolute path protocol tileSources augmented correctly', (done) => {
                request(`http://localhost:10002/getJson?source=${nockMockUrl}/3.json`, (err, res, body) => {
                    expect(err).to.be.equal(null);
                    expect(res.statusCode).to.be.equal(200);
                    expect(JSON.parse(body)).to.be.deep.equal(mockReplyJson3_augmented);
                    done();
                });
            });
        });
    });

    it('endpoint /getTile exists', (done) => {
        request('http://localhost:10002/getTile', (err, res, body) => {
            expect(err).to.be.equal(null);
            expect(res.statusCode).to.be.equal(404);
            done();
        });
    });

    describe('endpoint /getTile pipes response correctly', () => {
        it('pipes requests correctly', (done) => {
            request(`http://localhost:10002/getTile?source=${nockMockUrl}/test.jpg`, (err, res, body) => {
                expect(err).to.be.equal(null);
                expect(res.statusCode).to.be.equal(200);
                expect(body).to.be.equal(imageData);
                done();
            });
        });
    });
});
