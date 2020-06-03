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

function buildFileID({source, slice}) {
    return `${source}&slice=${slice}`;
}

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
    it('mocha works in api.spec.js', () => {
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
        queryProject = sinon.fake.resolves({ 
            collaborators: {
                list: [
                    { username: 'anyone' },
                    { username: 'alice' }
                ]
            },
            owner: 'bob'
        })
    
    before(() => {
        app.db = {
            updateAnnotation,
            findAnnotations,
            queryProject
        }
        _server = app.listen(port, () => console.log(`mocha test listening at ${port}`))
    })

    beforeEach(() => {
        updateAnnotation.resetHistory()
        findAnnotations.resetHistory()
        queryProject.resetHistory()
    })

    after(() => {
        _server.close()
    })

    describe('saveFromGUI', () => {

        describe('/GET', () => {
            it('should return status 200', (done) => {
                chai.request(url)
                    .get('/')
                    .query({
                        project: 'testProject'
                    })
                    .end((err, res) => {
                        expect(res).to.have.status(200)
                        done()
                    })
            })
    
            it('fetching annotation from different project names work', (done) => {
                const getTest = name => chai.request(url)
                    .get('/')
                    .query({
                        project: name
                    })
                    .then((res) => {
                        assert(queryProject.called)
                        assert(queryProject.calledWith({ shortname: name }))
                    })
                
                Promise.all( [
                    getTest(''),
                    getTest('test1'),
                    getTest('test2'),
                    chai.request(url)
                        .get('/')
                        .then((res) => {
                            assert(queryProject.called)
                            assert(queryProject.calledWith({ shortname: '' }))
                        })
                    ] ).then(() => {
                        done()
                    }).catch(done)
            })
        })

        describe('/POST', () => {

            it('varying source and slice should call findAnnotation with the correct call sig', (done) => {
                const project = 'projectIsAlreadyTestedAbove'
                const getTest = ({ source, slice, project }) => chai.request(url)
                    .get('/')
                    .query({
                        source,
                        slice,
                        project
                    })
                    .then(res => {
                        assert(findAnnotations.calledWith({
                            fileID: `${source}&slice=${slice}`,
                            user: {
                                $in: ['alice', 'bob']
                            },
                            project
                        }))
                    })
                Promise.all([
                    getTest({ source: 'test1', slice: '123', project }),
                    getTest({ source: 'test2', slice: '1234', project }),
                    getTest({ source: '', slice: '', project }),
                    chai.request(url)
                        .get('/')
                        .query({
                            project
                        })
                        .then(res => {
                            assert(findAnnotations.calledWith({
                                fileID: `undefined&slice=undefined`,
                                user: {
                                    $in: ['alice', 'bob']
                                },
                                project
                            }))
                        })
                ]).then(() => done())
                .catch(done)
            })

            it('varying authenticated state should result in different username being associated', (done) => {
                const sendItem = {
                    action: 'save',
                    source: '/path/to/json.json',
                    slice: 24,
                    Hash: 'testworld',
                    annotation: 'testworld',
                    project: 'alreadyTestedPreviously'
                }

                const { action, source, slice, ...rest } = sendItem

                const getTest = () => chai.request(url)
                    .post('/')
                    .set('content-type', 'application/x-www-form-urlencoded')
                    .send(sendItem)

                const doTest = async () => {
                    await getTest()
                    assert(updateAnnotation.calledWith({
                        fileID: '/path/to/json.json&slice=24',
                        user: 'anyone',
                        ...rest
                    }))

                    authenticated = true

                    await getTest()
                    assert(updateAnnotation.calledWith({
                        fileID: '/path/to/json.json&slice=24',
                        user: 'bobby',
                        ...rest
                    }))
                }

                doTest()
                    .then(() => done())
                    .catch(done)
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
            action,
            project: 'alreadyTestedPreviously'
        })

        const getTest = (queryParam, { illFormedJson = false } = {}) => chai.request(url)
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
            .query(queryParam)
    
        let readFileStub
        
        describe('/POST', () => {

            beforeEach(() => {
                authenticated = true
                returnFoundAnnotation = true
    
                readFileStub = sinon.stub(fs, 'readFileSync')
                readFileStub.withArgs(FILENAME1).returns(Buffer.from(JSON.stringify(correctJson)))
                readFileStub.withArgs(FILENAME2).returns(Buffer.from(JSON.stringify(incorrectJSON)))
            })
        
            afterEach(() => {
                readFileStub.restore()
            })


            describe('authenciation status behave expectedly', () => {
                it('unauthenticated user gets 401, and findannotations/update annotations NOT called', (done) => {
                    authenticated = false
                    
                    const doTest = async () => {

                        const res = await getTest({ ...getQueryParam({ action: 'save' }) })

                        assert(findAnnotations.notCalled)
                        assert(updateAnnotation.notCalled)
                        assert(res.status === 401)
                        expect(res.body).to.deep.equal({
                            msg: 'Invalid user'
                        })

                        const res2 = await getTest({ ...getQueryParam({ action: 'append' }) })

                        assert(findAnnotations.notCalled)
                        assert(updateAnnotation.notCalled)
                        assert(res2.status === 401)
                        expect(res2.body).to.deep.equal({
                            msg: 'Invalid user'
                        })
                    }

                    doTest()
                        .then(() => done())
                        .catch(done)
                })

                it('authenticated user gets 200, findannotation and updateannotation called', (done) => {
                    authenticated = true

                    const doTest = async () => {
                        
                        const param = getQueryParam({ action: 'save' })
                        const { source, slice, action, project, ...rest } = param
                        const res = await getTest(param)

                        /**
                         * action=save does not call findAnnotation
                         */
                        assert(findAnnotations.notCalled)
                        assert(updateAnnotation.calledWith({
                            fileID: buildFileID({ source, slice }),
                            user: 'bobby',
                            project,
                            annotation: JSON.stringify({
                                Regions: correctJson.map(v => v.annotation)
                            }),
                            ...rest,

                        }))
                        assert(res.status === 200)
                        expect(res.body).to.deep.equal({
                            msg: 'Annotation successfully saved'
                        })

                        const res2 = await getTest({ ...getQueryParam({ action: 'append' }) })

                        assert(findAnnotations.calledWith({
                            fileID: buildFileID({ source, slice}),
                            user: 'bobby',
                            project
                        }))
                        assert(updateAnnotation.calledWith({
                            fileID: buildFileID({ source, slice}),
                            user: 'bobby',
                            project,
                            annotation: JSON.stringify({
                                Regions: correctJson.map(v => v.annotation)
                            }),
                            ...rest,

                        }))
                        assert(res2.status === 200)
                        expect(res2.body).to.deep.equal({
                            msg: 'Annotation successfully saved'
                        })
                    }

                    doTest().then(() => done()).catch(done)
                })
            })
        })
    })
})

