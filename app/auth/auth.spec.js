const mock = require('mock-fs')
const fs = require('fs')
const path = require('path')

const assert = require('assert')
const chai = require('chai')
const express = require('express')

const expect = chai.expect

describe('Mocha Started',()=>{
    it('Mocha works properly',()=>{
        assert.equal(1,1)
    })
})

const test_txt = 'test_javalin'
const github_keys = {"clientID": "testclientID","clientSecret": "testclientsecret","callbackURL": "testcallbackurl"}

const getMockfsConfig = (filename, content) => {
    const obj = {}
    obj[path.join(__dirname, filename)] = content
    return obj
}

describe('mock-fs works properly',()=>{
    before(()=>{
        const config = {
            ...getMockfsConfig('test.txt', test_txt),
            ...getMockfsConfig('github-keys.json', JSON.stringify(github_keys))
        }
        mock(config)
    })

    after(()=>{
        mock.restore()
    })

    it('fetches mocked test.txt properly',(done)=>{
        fs.readFile(path.join(__dirname, 'test.txt'),'utf-8',(err,data)=>{
            expect(err).to.be.equals(null)
            expect(data).to.be.equals(test_txt)
            done()
        })

    })

    it('should throw err when fetching non existent file',(done)=>{
        fs.readFile(path.join(__dirname, 'not_exist_txt'),'utf-8',(err,data)=>{
            expect(err).to.be.not.equal(null)
            expect(err.code).to.be.equal('ENOENT')
            done()
        })
    })

    it('mock-fs fetches github-keys.json',(done)=>{
        fs.readFile(path.join(__dirname, 'github-keys.json'),'utf-8',(err,data)=>{
            expect(err).to.be.equal(null)
            expect(data).to.be.equal(JSON.stringify(github_keys))
            done()
        })
    })
})

const containGithubLoginMethod = (loginMethods) => loginMethods.findIndex(loginMethod=>/github/i.test(loginMethod.url)) >= 0
const containLocalLoginMethod = (loginMethods) => loginMethods.findIndex(loginMethod=>/local/i.test(loginMethod.url)) >= 0

/* must declare auth before mock-fs, or else require will fail */
const auth = require('./auth')

describe('auth api works properly',()=>{

    afterEach(() => {
        mock.restore()
    })

    describe('github signin strategy works',()=>{
        it('without github-keys.json, app.loginMethods will not be populated with github methods',()=>{
            const app = express()
            mock({})
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containGithubLoginMethod(loginMethods) ).to.be.equal(false)
        })

        it('with mal-formed github-key.json, app.loginMethods will not be populated with github methods',()=>{
            mock(getMockfsConfig('github-keys.json', test_txt))
            const app = express()
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containGithubLoginMethod(loginMethods) ).to.be.equal(false)
        })

        it('with valid github-keys.json, app.loginMethods will be populated with github methods',()=>{
            mock(getMockfsConfig('github-keys.json', JSON.stringify(github_keys)))
            const app = express()
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containGithubLoginMethod(loginMethods) ).to.be.equal(true)
        })
    })

    describe('local signin strategy works',()=>{
        
        it('when LOCALSIGNIN=undefined, local signin does not exist',()=>{
            const app = express()
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containLocalLoginMethod(loginMethods) ).to.be.equal( false )
        })

        it('when LOCALSIGNIN=false, local signin does not exist',()=>{
            process.env.LOCALSIGNIN = false
            const app = express()
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containLocalLoginMethod(loginMethods) ).to.be.equal( false )
        })

        it('when LOCALSIGNIN=true, local signin exists',()=>{
            process.env.LOCALSIGNIN = true
            const app = express()
            auth(app)
            const loginMethods = app.get('loginMethods')
            expect( containLocalLoginMethod(loginMethods) ).to.be.equal( true )
        })

    })
})