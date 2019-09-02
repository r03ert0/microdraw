const assert = require('assert')
const chai = require('chai')
const bodyParser = require('body-parser');
const chaiHttp = require('chai-http')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

const express = require('express')
const app = express()

let authorized = false

app.use((req, res, next) => {
    if (authorized) {
        req.user = {
            username: 'bobby'
        }
    }
    return next()
})

app.use(bodyParser.urlencoded({ extended: false }))

/**
 * simulate authenication status
 * testing authentication is not the aim of this test suite
 * these tests only check if api works as intended
 */
let authenticated = false
const USER = 'bobby'
app.use((req, res, next) => {
    if (authenticated) {
        req.user = {
            username: USER
        }
    }
    next()
})
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

describe('controller/api/index.js', () => {
    const annoationInDb = {
        Regions: ['hello: world', 'foobar']
    }
    let _server,
        port = 10002,
        url = `http://127.0.0.1:${port}`,
    
        returnFoundAnnotation = true,
        updateAnnotation = sinon.fake.resolves(), 
        findAnnotations = sinon.fake.resolves(returnFoundAnnotation ? annoationInDb : {Regions: []})
    
    before(() => {
        app.db = {
            updateAnnotation,
            findAnnotations
        }
        _server = app.listen(port, () => console.log(`mocha test listening at ${port}`))
    })

    beforeEach(() => {
        updateAnnotation.resetHistory()
        findAnnotations.resetHistory()
    })

    after(() => {
        _server.close()
    })

    describe('saveFromGUI', () => {

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

    describe('saveFromAPI', () => {

        let FILENAME1 = `FILENAME1.json`
        let FILENAME2 = `FILENAME2.json`
        const correctJson = [
            {
                "annotation": {
                    "path": [
                        "Path",
                        {
                            "applyMatrix": true,
                            "segments": [
                                [345, 157],
                                [386, 159],
                                [385, 199]
                            ],
                            "closed": true,
                            "fillColor": [0.1, 0.7, 0.6, 0.5],
                            "strokeColor": [0, 0, 0],
                            "strokeScaling": false
                        }
                    ],
                    "name": "Contour 1"
                }
            },
            {
                "annotation": {
                    "path": [
                        "Path",
                        {
                            "applyMatrix": true,
                            "segments": [
                                [475, 227],
                                [502, 155],
                                [544, 221]
                            ],
                            "closed": true,
                            "fillColor": [0.0, 0.0, 0.6, 0.5],
                            "strokeColor": [0, 0, 0],
                            "strokeScaling": false
                        }
                    ],
                    "name": "Contour 2"
                }
            }
        ]
    
        const incorrectJSON = {
            hello: "world"
        }

        const getQueryParam = ({ action = 'append' } = {}) => ({
            source: '/path/to/json.json',
            slice: 24,
            Hash: 'hello world',
            action
        })

        const makeChaiRequest = ({ action = 'append', illFormedJson = false } = {}) => chai.request(url)
            .post('/upload')
            .attach(
                'data',
                illFormedJson
                    ? fs.readFileSync(FILENAME2)
                    : fs.readFileSync(FILENAME1),
                illFormedJson
                    ? FILENAME2
                    : FILENAME1
            )
            .query(getQueryParam({ action }))
    
        let readFileStub
        

        describe('action=save', () => {

            beforeEach(() => {
                authenticated = true
                returnFoundAnnotation = true
    
                readFileStub = sinon.stub(fs, 'readFileSync')
                readFileStub.withArgs(FILENAME1).returns(Buffer.from(JSON.stringify(correctJson)))
                readFileStub.withArgs(FILENAME2).returns(Buffer.from(JSON.stringify(incorrectJSON)))
    
                authenticated = true
            })
        
            afterEach(() => {
                readFileStub.restore()
            })

            const action = 'save'

            it('if unauthenticated, should response 401', (done) => {
                authenticated = false
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        expect(res.status).equal(401)
                        expect(res).to.be.json
                        expect(res.body).to.deep.equal({msg: "API upload requires a valid token authentication"})
                        done()
                    })
            })

            it('if attaches invalid json, should respond 401', (done) => {

                makeChaiRequest({ action, illFormedJson: true })
                    .end((err, res) => {
                        assert(!err)
                        expect(res.status).equal(401)
                        expect(res).to.be.json
                        expect(res.body).to.deep.equal({msg: "Invalid annotation file"})
                        done()
                    })
            })

            it('response is as expected', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        expect(res.status).equal(200)
                        done()
                    })
            })

            it('db.findAnnotation NOT called', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        assert(!findAnnotations.called)
                        done()
                    })
            })
    
            it('db.updateAnnotation called', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        assert(updateAnnotation.called)
                        const { source, slice, Hash, action } = getQueryParam()
                        const { Regions } = annoationInDb
                        const annotation = {
                            Regions: correctJson.map(v => v.annotation)
                        }
    
                        assert(updateAnnotation.calledWith({
                            fileID: `${source}&slice=${slice}`,
                            user: USER,
                            Hash,
                            annotation: JSON.stringify(annotation)
                        }))
                        done()
                    })
            })
    
        })

        describe('action=append', () => {

            beforeEach(() => {
                authenticated = true
                returnFoundAnnotation = true
    
                readFileStub = sinon.stub(fs, 'readFileSync')
                readFileStub.returns(Buffer.from(JSON.stringify(correctJson)))
    
                authenticated = true
            })
        
            afterEach(() => {
                readFileStub.restore()
            })

            const action = 'append'
            
            it('response is as expected', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        expect(res.status).equal(200)
                        done()
                    })
            })
    
            it('db.findAnnotation called', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        assert(findAnnotations.called)
    
                        const { source, slice, Hash, action } = getQueryParam()
                        assert(findAnnotations.calledWith({
                            fileID: `${source}&slice=${slice}`,
                            user: USER
                        }))
                        done()
                    })
            })
    
            it('db.updateAnnotation called', (done) => {
                makeChaiRequest({ action })
                    .end((err, res) => {
                        assert(!err)
                        assert(updateAnnotation.called)
                        const { source, slice, Hash, action } = getQueryParam()
                        const { Regions } = annoationInDb
                        const annotation = {
                            Regions: Regions.concat(correctJson.map(v => v.annotation))
                        }
    
                        assert(updateAnnotation.calledWith({
                            fileID: `${source}&slice=${slice}`,
                            user: USER,
                            Hash,
                            annotation: JSON.stringify(annotation)
                        }))
                        done()
                    })
            })
        })
    })
})

