const assert = require('assert')
const chai = require('chai')
const bodyParser = require('body-parser');
const chaiHttp = require('chai-http')
const expect = chai.expect
const sinon = require('sinon')

const express = require('express')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(require('./index'))
chai.use(chaiHttp)

describe('Mocha works', () => {
    it('mocha works in routes.spec.js', () => {
        assert.equal(1, 1)
    })
})

describe('sinon works', () => {
    it('fake called works', () => {
        const fake = sinon.fake()
        expect(fake.called).to.be.false
        fake()
        expect(fake.called).to.be.true
    })

    it('fake calls with arguements works', () => {
        const fake = sinon.fake()
        const arg = {
            hello: 'world'
        }
        fake(arg)
        assert(fake.calledWith({
            hello: 'world'
        }))
    })
})

describe('testing api', () => {
    let _server,
        port = 10002,
        url = `http://127.0.0.1:${port}`
        updateAnnotation = sinon.fake.resolves(), 
        findAnnotations = sinon.fake.resolves([{
            hello:'world'
        }])
    before(() => {
        app.db = {
            updateAnnotation,
            findAnnotations
        }
        _server = app.listen(port, () => console.log(`mocha test listening at ${port}`))
    })

    after(() => {
        _server.close()
    })

    it('should find annotation fine', (done) => {
        chai.request(url)
            .get('/')
            .end((err, res) => {
                expect(res).to.have.status(200)
                assert(findAnnotations.called)
                done()
            })
    })

    it('should find fileID & section fine', (done) => {
        chai.request(url)
            .get('/?source=/path/to/json.json&slice=42')
            .end((err, res) => {
                expect(res).to.have.status(200)
                assert(findAnnotations.calledWith({
                    fileID: '/path/to/json.json&slice=42',
                    user: 'anonymous'
                }))
                done()
            })
    })

    it('should post fileID & section fine', (done) => {
        const sendItem = {
            action: 'save',
            source: '/path/to/json.json',
            slice: 24,
            Hash: 'testworld',
            annotation: 'testworld'
        }
        chai.request(url)
            .post('/')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(sendItem)
            .end((err, res) => {
                expect(res).to.have.status(200)
                
                const { action, source, slice, ...rest } = sendItem
                assert(updateAnnotation.calledWith({
                    fileID: '/path/to/json.json&slice=24',
                    user: 'anonymous',
                    ...rest
                }))

                done()
            })
    })
})