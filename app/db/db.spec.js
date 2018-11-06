const assert = require('assert')
const expect = require('chai').expect

const db = require('./db')()
const garbageDb = require('./db')('GARBAGE_MONGO:27017/GARBAGE_MONGO')

describe('Mocha Started',()=>{
    it('Mocha works properly',()=>{
        assert.equal(1,1)
    })
})

describe('testing db.js',()=>{

    const dummyUser = {
        username : 'tommy jones',
        age : 14
    }
    const dummyUser2 = {
        username : 'jessica jones',
        age : 55
    }

    const dummyAnnotation = {
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : JSON.stringify({
            annotationKey1 : 'dummy annotation 1 annotation value 1',
            annotationkey2 : 'dummy annotation 1 annotation value 2',
            Regions : ['dummy annotation 1 region1','dummy annotation 1 region2']
        }),
        annotationHash : 'abc123'
    }

    const expectedSavedDummy = [{
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : 'dummy annotation 1 region2',
        annotationHash : 'abc123'
    },{
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : 'dummy annotation 1 region1',
        annotationHash : 'abc123'
    }]

    const dummyAnnotation_updated = {
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : JSON.stringify({
            annotationKey1 : 'dummy annotation 1 annotation value 1 updated',
            annotationkey2 : 'dummy annotation 1 annotation value 2 updated',
            Regions : ['dummy annotation 1 updated region1','dummy annotation 1 updated region2']
        }),
        annotationHash : 'abc123 updated'
    }

    const expectedSavedDummyUpdated = [{
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : 'dummy annotation 1 updated region2',
        annotationHash : 'abc123 updated'
    },{
        fileID : 'dummy fileID 1',
        user : 'tommy jones',
        annotation : 'dummy annotation 1 updated region1',
        annotationHash : 'abc123 updated'
    }]


    const dummyAnnotation2 = {
        fileID : 'dummy fileID 2',
        user : 'anonymouse',
        annotation : JSON.stringify({
            annotationKey1 : 'dummy annotation 2 annotation value 1',
            annotationkey2 : 'dummy annotation 2 annotation value 2',
            Regions : ['dummy annotation 2 region1','dummy annotation 2 region2']
        }),
        annotationHash : '123abc'
    }

    const expectedSavedDummy2 = [{
        fileID : 'dummy fileID 2',
        user : 'anonymouse',
        annotation : 'dummy annotation 2 region1',
        annotationHash : '123abc'
    },{
        fileID : 'dummy fileID 2',
        user : 'anonymouse',
        annotation : 'dummy annotation 2 region2',
        annotationHash : '123abc'
    }]

    before(()=>{
        db.db.get('users').drop()
        db.db.get('annotations').drop()
    })

    after(()=>{
        db.db.get('users').drop()
        db.db.get('annotations').drop()
        db.db.close()
    })

    it('health check should reflect db health', () => {
        expect(db.checkHealth()).to.be.equal(true)
        expect(garbageDb.checkHealth()).to.be.equal(false)
    })

    it('querying the empty mongodb should not yield any results',(done)=>{
        db.queryUser({
            username : dummyUser.username
        }).then(user=>{
            done('should have been empty, but not really empty')
        }).catch(e=>{
            expect(e.message).to.equal('error find one user')
            done()
        })
    })

    describe('testing adding and querying users',()=>{

        it('adding user works fine',(done)=>{
            db.addUser(dummyUser)
                .then(returnedUser=>{
                    expect(returnedUser).to.equal(dummyUser)
                    done()
                })
                .catch(e=>done(e))
        })
        it('adding an additional user works fine',(done)=>{
            db.addUser(dummyUser2)
                .then(returnedUser=>{
                    expect(returnedUser).to.equal(dummyUser2)
                    done()
                })
                .catch(e=>done(e))
        })
    
        it('querying the inserted users should work as expected',(done)=>{
            Promise.all([
                db.queryUser({
                    username : dummyUser.username
                }),
                db.queryUser({
                    username : dummyUser2.username
                })
            ]).then(users=>{
                expect(users).to.deep.equal([
                    dummyUser,
                    dummyUser2
                ])
                done()
            }).catch(e=>done(e))
        })
    })

    describe('testing adding, and querying annotations',()=>{

        it('should add annotations fine',(done)=>{
            db.updateAnnotation(dummyAnnotation)
                .then(()=>done())
                .catch(e=>done(e))
        })

        it('should query the added annotation fine',(done)=>{
            const { fileID } = dummyAnnotation
            db.findAnnotations({
                fileID 
            })
                .then(annotations=>{
                    annotations.forEach(anno=>{
                        const { user, fileID, annotationHash, annotation } = anno
                        expect(expectedSavedDummy).to.deep.include.members([{ user, fileID, annotationHash, annotation }])
                    })
                    done()
                })
                .catch(e=>done(e))

        })

        it('should add another annotations fine',(done)=>{
            db.updateAnnotation(dummyAnnotation2)
                .then(()=>done())
                .catch(e=>done(e))
        })

        it('should query the added annotation fine',(done)=>{
            const { fileID } = dummyAnnotation2
            db.findAnnotations({
                fileID 
            })
                .then(annotations=>{
                    annotations.forEach(anno=>{
                        const { user, fileID, annotationHash, annotation } = anno
                        expect(expectedSavedDummy2).to.deep.include.members([{ user, fileID, annotationHash, annotation }])
                    })
                    done()
                })
                .catch(e=>done(e))

        })



        it('should update fine',(done)=>{
            db.updateAnnotation(dummyAnnotation_updated)
                .then(()=>done())
                .catch(e=>done(e))
        })

        it('should fetch the updated annotation',(done)=>{
            
            const { fileID } = dummyAnnotation_updated
            db.findAnnotations({
                fileID
            })
                .then(annotations=>{
                    annotations.forEach(anno=>{
                        const { user, fileID, annotationHash, annotation } = anno
                        expect(expectedSavedDummyUpdated).to.deep.include.members([{ user, fileID, annotationHash, annotation }])
                    })
                    done()
                })
                .catch(e=>done(e))
        })
        
        it('should fetch an empty array when no results could be found',(done)=>{
            db.findAnnotations({
                fileID : 'clearly a non-existent fileid'
            }).then(annotations=>{
                expect(annotations).to.be.deep.equal([])
                done()
            }).catch(e=>done(e))
        })
        
    })
})
