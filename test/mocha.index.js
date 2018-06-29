const assert = require('assert')

describe('array',()=>{
  describe('.indexOf()',()=>{
    it('should return -1 when not present',()=>{
      assert.equal([1,2,3].indexOf(4),-1)
    })
  })
})

describe('app-db communication',()=>{
  require('./mocha.app.db')
})