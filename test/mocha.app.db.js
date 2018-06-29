const assert = require('assert')
const sinon = require('sinon')
const chai = require('chai')
const monk = require('monk')

const db = monk(process.env.MONGODB || 'medpc055.ime.kfa-juelich.de:27017/json_db')
let dbTestCollection
beforeEach(()=>{
  dbTestCollection = db.create('mocha-test')
})

afterEach(()=>{
  dbTestCollection.drop()
})

describe('mongodb',()=>{
  it('should insert document',()=>{
    dbTestCollection.insert({test:'hello world'})
      .then(()=>chai.assert.isOk())
      .catch(e=>chai.assert.isNotOk())
  })

  it('should fetch the inserted document',()=>{
    dbTestCollection.findOne({test:'hello world'})
      .then(doc=>{
        expect(doc).to.deep.equal({test:'hello world'})
      })
      .catch(e=>chai.assert.isNotOk())
  })

  it('should delete the inserted document',()=>{
    dbTestCollection.findOneAndDelete({test:'hello world'})
      .then((doc)=>chai.assert.isOk())
      .catch(e=>chai.assert.isNotOk())
  })
})
