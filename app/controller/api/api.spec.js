const assert = require('assert')
const chai = require('chai')
const bodyParser = require('body-parser');
const chaiHttp = require('chai-http')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')

const express = require('express')
const app = express()

function buildFileID({source, slice}) {
    return `${source}&slice=${slice}`;
}
app.use(bodyParser.urlencoded({ extended: true }))

/**
 * simulate authenication status
 * testing authentication is not the aim of this test suite
 * these tests only check if api works as intended
 */
let authenticatedUser = null

const USER_ANONYMOUSE = {
    username: 'anyone'
}

const USER_BOB = {
    username: 'bob'
}
const USER_ALICE = {
    username: 'alice'
}
const USER_CINDY = {
    username: 'cindy'
}

app.use((req, res, next) => {
    if (authenticatedUser) {
        req.user = authenticatedUser
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

    it('stub can dynamically change return val', () => {
        const stub = sinon.stub()
        let flag = true
        stub.callsFake(() => flag)
        expect(stub()).to.equal(true)

        flag = false
        expect(stub()).to.equal(false)
    })
})

describe('controller/api/index.js', () => {
    const annoationInDb = {
        Regions: ['hello: world', 'foobar']
    }
    let _server,
        queryPublicProject = false,
        publicProject = { 
            owner: USER_BOB.username,
            collaborators: {
                list: [ USER_ALICE, USER_BOB, USER_ANONYMOUSE ]
            }
        },
        privateProject = {
            owner: USER_ALICE.username,
            collaborators: {
                list: [ USER_ALICE, USER_BOB ]
            }
        },
        port = 10002,
        url = `http://127.0.0.1:${port}`,
    
        returnFoundAnnotation = true,
        updateAnnotation = sinon.stub().resolves(), 
        findAnnotations = sinon.stub().callsFake(() => Promise.resolve( returnFoundAnnotation ? annoationInDb : {Regions: []} )),
        queryProject = sinon.stub().callsFake(() => Promise.resolve(queryPublicProject ? publicProject : privateProject))        
    
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

            describe('public project', () => {
                before(() => {
                    queryPublicProject = true
                })

                it('if user not part of project, should return 200', (done) => {
                    authenticatedUser = null
                    chai.request(url)
                        .get('/')
                        .query({
                            project: 'testProject'
                        })
                        .end((err, res) => {
                            expect(!!err).to.be.false
                            expect(res).to.have.status(200)
                            done()
                        })
                })

                it('if user is part of project, should return status 200', (done) => {
                    authenticatedUser = USER_BOB
                    chai.request(url)
                        .get('/')
                        .query({
                            project: 'testProject'
                        })
                        .end((err, res) => {
                            expect(!!err).to.be.false
                            expect(res).to.have.status(200)
                            done()
                        })
                })
            })

            describe('private project', () => {

                before(() => {
                    queryPublicProject = false
                })

                it('if user not part of project, should return 403', (done) => {
                    authenticatedUser = null
                    chai.request(url)
                        .get('/')
                        .query({
                            project: 'testProject'
                        })
                        .end((err, res) => {
                            expect(!!err).to.be.false
                            expect(res).to.have.status(403)
                            done()
                        })
                })

                it('if user is part of project, should return status 200', (done) => {
                    authenticatedUser = USER_BOB
                    chai.request(url)
                        .get('/')
                        .query({
                            project: 'testProject'
                        })
                        .end((err, res) => {
                            expect(!!err).to.be.false
                            expect(res).to.have.status(200)
                            done()
                        })
                })
            })

            describe('fetching annotation from different project querys project as expected', () => {
                const getTest = project => chai.request(url)
                    .get('/')
                    .query(
                        project ? ({ project }) : ({})
                    )
                    .then((res) => {

                        /**
                         * queryProject will only be called if user is querying annotation from a specific project
                         * then, their authorisation will be assessed
                         */
                        if (project) {
                            assert(queryProject.called)

                            /**
                             * if project not provided, as if project is an empty string
                             */
                            assert(queryProject.calledWith({ shortname: project }))
                        } else {
                            /**
                             * if user is querying public (default) work space, query project would not be called
                             */
                            assert(queryProject.notCalled)
                        }
                    })

                for (const p of ['', 'test1', 'test2', null]){
                    it(`fetching project: "${p}"`, done => {

                        getTest(p)
                            .then(() => done())
                            .catch(done)
                    })
                }
            })
        })

        describe('/POST', () => {
            describe('findAnnotation', () => {
                it('should be called with correct arg', done => {

                    const project = 'projectIsAlreadyTestedAbove'
                    const getTest = ({ source, slice, project }) => chai.request(url)
                        .get('/')
                        .query({
                            source,
                            slice,
                            project
                        })
                        .then(res => {
                            findAnnotations.callArg
                            assert(findAnnotations.calledWith({
                                fileID: `${source}&slice=${slice}`,
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
                                    project
                                }))
                            })
                    ]).then(() => done())
                    .catch(done)
                })
            })

            describe('varying users', () => {
                const sendItem = {
                    action: 'save',
                    source: '/path/to/json.json',
                    slice: 24,
                    Hash: 'testworld',
                    annotation: 'testworld',
                    project: 'alreadyTestedPreviously'
                }
                const { action, source, slice, ...rest } = sendItem
                let res

                beforeEach(async () => {
                    res = await chai.request(url)
                        .post('/')
                        .set('content-type', 'application/x-www-form-urlencoded')
                        .send(sendItem)
                })

                it('ok', () => {
                    assert(true)
                })

                describe('unauthenticated user', () => {
                    before(() => {
                        authenticatedUser = null
                    })

                    it('should return 403', () => {
                        const { status } = res
                        expect(status).to.equal(403)
                    })
                })

                describe('authenicated user, with correct permission', () => {
                    before(() => {
                        authenticatedUser = USER_BOB
                    })

                    it('should return 200', () => {
                        const { status } = res
                        expect(status).to.equal(200)
                    })

                    it('updateAnnotation should be called', () => {
                        assert(updateAnnotation.called)
                    })

                    it('updateAnnotation called with correct arg', () => {

                        assert(updateAnnotation.calledWith({
                            fileID: '/path/to/json.json&slice=24',
                            user: USER_BOB.username,
                            ...rest
                        }))
                    })
                })
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

        let readFileStub

        before(() => {
            readFileStub = sinon.stub(fs, 'readFileSync')
            readFileStub.withArgs(FILENAME1).returns(Buffer.from(JSON.stringify(correctJson)))
            readFileStub.withArgs(FILENAME2).returns(Buffer.from(JSON.stringify(incorrectJSON)))
        })

        after(() => {
            readFileStub.restore()
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
    
        
        describe('/POST', () => {

            describe('authenciation status behave expectedly', () => {
                describe('unauthenicated user', () => {
                    describe('action=save', () => {

                        let res
                        before(async () => {
                            authenticatedUser = null
                            res = await getTest({ ...getQueryParam({ action: 'save' }) })
                        })
    
                        it('returns 401', () => {
                            assert(res.status === 401)
                        })
    
                        it('status text is as expected', () => {
                            expect(res.body).to.deep.equal({
                                msg: 'Invalid user'
                            })
                        })
    
                        it('findAnnotation is NOT called', () => {
                            assert(findAnnotations.notCalled)
                        })
    
                        it('updateAnnotation NOT called', () => {
                            assert(updateAnnotation.notCalled)
                        })
                    })
                    describe('action=append', () => {

                        let res
                        before(async () => {
                            authenticatedUser = null
                            res = await getTest({ ...getQueryParam({ action: 'append' }) })
                        })
    
                        it('returns 401', () => {
                            assert(res.status === 401)
                        })
    
                        it('status text is as expected', () => {
                            expect(res.body).to.deep.equal({
                                msg: 'Invalid user'
                            })
                        })
    
                        it('findAnnotation is NOT called', () => {
                            assert(findAnnotations.notCalled)
                        })
    
                        it('updateAnnotation NOT called', () => {
                            assert(updateAnnotation.notCalled)
                        })
                    })
                })
                
                // describe('authenicated user', () => {

                //     describe('action=save', () => {
                //         let res, param
                //         before(async () => {
                //             authenticatedUser = USER_BOB
    
                //             param = getQueryParam({ action: 'save' })
    
                //             const { source: paramSource, slice, action, project, ...rest } = param
                //             res = await getTest(param)
                //         })
    
                //         it('returns 200', () => {
                //             assert(res.status === 200)
                //         })
    
                //         it('return body text is as expected', () => {
                //             expect(res.body).to.deep.equal({
                //                 msg: 'Annotation successfully saved'
                //             })
                //         })
    
                //         /**
                //          * action=save does not call findAnnotation
                //          */
                //         it('findAnnotation not called', () => {
                //             assert(findAnnotations.notCalled)
                //         })
    
                //         it('updateAnnotation is called', () => {
                //             assert(updateAnnotation.called)
                //         })
    
                //         it('updateAnnotation called with correct param', () => {
    
                //             const { source, slice, ...rest } = param

                //             console.log('--------------------')
                //             console.log(updateAnnotation.firstCall.args)
                //             assert(updateAnnotation.calledWith({
                //                 fileID: buildFileID({ source, slice }),
                //                 user: USER_BOB.username,
                //                 project,
                //                 annotation: JSON.stringify({
                //                     Regions: correctJson.map(v => v.annotation)
                //                 }),
                //                 ...rest,
                //             }))
                //         })
                //     })

                //     describe('action=append', () => {
                //         let res2

                //         before(async () => {
                //             authenticatedUser = USER_BOB
                //             res2 = await getTest({ ...getQueryParam({ action: 'append' }) })
                //         })

                //         it('returns 200', () => {
                //             assert(res2.status === 200)
                //         })

                //         it('body text as expected', () => {
                //             expect(res2.body).to.deep.equal({
                //                 msg: 'Annotation successfully saved'
                //             })
                //         })

                //         it('findAnnotation is called', () => {
                //             assert(findAnnotations.called)
                //         })

                //         it('findAnnotation called with correct param', () => {
                //             assert(findAnnotations.calledWith({
                //                 fileID: buildFileID({ source, slice}),
                //                 user: USER_BOB.username,
                //                 project
                //             }))
                //         })

                //         it('update annotation called', () => {
                //             assert(updateAnnotation.called)
                //         })

                //         it('updatedannotation called with correct param', () => {

                //             assert(updateAnnotation.calledWith({
                //                 fileID: buildFileID({ source, slice}),
                //                 user: USER_BOB.username,
                //                 project,
                //                 annotation: JSON.stringify({
                //                     Regions: correctJson.map(v => v.annotation)
                //                 }),
                //                 ...rest,
    
                //             }))
                //         })
                //     })
                // })
            })
        })
    })
})

