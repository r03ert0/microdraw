const assert = require('assert')
const chai = require('chai')
const bodyParser = require('body-parser');
const chaiHttp = require('chai-http')
const expect = chai.expect
const sinon = require('sinon')

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

describe('api.js', () => {
    let _server
    const port = 10002
    const url = `http://127.0.0.1:${port}`
    const updateAnnotation = sinon.fake.resolves()
    const findAnnotations = sinon.fake.resolves([{
        hello:'world'
    }])
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

        const path = require('path')
        const fs = require('fs')

        const source = 'testSource'
        const slice = '5'

        const testJson = [
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

        const storedInDb = {
            fileID: `testSource&slice=5`,
            user: 'bobby',
            annotation: "{\"Regions\":[{\"path\":[\"Path\",{\"applyMatrix\":true,\"segments\":[[345,157],[386,159],[385,199]],\"closed\":true,\"fillColor\":[0.1,0.7,0.6,0.5],\"strokeColor\":[0,0,0],\"strokeScaling\":false}],\"name\":\"Contour 1\"},{\"path\":[\"Path\",{\"applyMatrix\":true,\"segments\":[[475,227],[502,155],[544,221]],\"closed\":true,\"fillColor\":[0,0,0.6,0.5],\"strokeColor\":[0,0,0],\"strokeScaling\":false}],\"name\":\"Contour 2\"}]}"
        }
        before(() => {
            const mock = require('mock-fs')

            const { getMockfsConfig } = require('../../../test/mocha.test.util')
            const config = getMockfsConfig(__dirname, 'data.json', JSON.stringify(testJson))
            mock(config)
            
        })
        
        it('unauthorized post request should return 401', (done) => {
            authorized = false
            
            const filePath = path.join(__dirname, 'data.json')
            chai.request(url)
                .post(`/upload?source=${source}&slice=${slice}`)
                .attach('data', fs.readFileSync(filePath), 'data.json')
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res).to.have.status(401)
                    expect(updateAnnotation.called).to.be.false
                    done()
                })
                
        })

        // it('malformed post requests should return 400', (done) => {
        //     done()
        // })

        it('authorized post request should return 200', (done) => {
            authorized = true

            const filePath = path.join(__dirname, 'data.json')
            const attachedFile = fs.readFileSync(filePath)
            chai.request(url)
                .post(`/upload?source=${source}&slice=${slice}`)
                .attach('data', attachedFile, 'data.json')
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res).to.have.status(200)
                    assert(updateAnnotation.calledWith(storedInDb))
                    done()
                })
        })
    })
})