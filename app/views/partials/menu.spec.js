const chai = require('chai')
const assert = require('assert')
const request = require('request')
const expect = chai.expect
const express = require('express')
const mustacheExpress = require('mustache-express')
const app = express()

app.engine('mustache',mustacheExpress())
app.set('views',__dirname)
app.set('view engine','mustache')

const bobjane = {
    username : 'bobjane'
}
const marydoe = {
    username : 'marydoe'
}
const loginMethods = [{
    url : 'http://github.com',
    text : 'github'
},{
    url : 'http://facebook.com',
    text : 'facebook'
}]

const logoutRegex = /\<span\>\(\<a href \= \"\/logout\"\>Log Out\<\/a\>\)\<\/span\>/
const userRegex = (username)=> new RegExp(`\<span\>\<a href = \"\/user\/${username}\"\>${username}\<\/span\>`)

const login1 = /\<span\>\<a href = \"http:\/\/github.com\"\>github\<\/a\>\<\/span\>/
const login2 = /\<span\>\<a href = \"http:\/\/facebook.com\"\>facebook\<\/a\>\<\/span\>/

app.get('/bobjane',(req,res)=>{
    res.render('menu',{
        user : bobjane,
        loginMethods 
    })
})

app.get('/marydoe',(req,res)=>{
    res.render('menu',{
        user:marydoe,
        loginMethods 
    })
})

app.get('/notLoggedIn',(req,res)=>{
    res.render('menu',{
        loginMethods
    })
})

app.get('/nothingProvided',(req,res)=>{
    res.render('menu',{

    })
})

describe('Mocha Started',()=>{
    it('Mocha works properly',()=>{
        assert.equal(1,1)
    })
})

let _server
describe('render user correctly',()=>{
    before(()=>{
        _server = app.listen(10002)
    })

    after(()=>{
        _server.close()
    })

    it('fetches user bobjane correctly',(done)=>{
        request('http://localhost:10002/bobjane',(err,res,body)=>{
            expect(err).to.be.equal(null)
            expect(res.statusCode).to.equal(200)
            expect(body).to.match(userRegex('bobjane'))
            expect(body).to.match(logoutRegex)

            expect(body).to.not.match(login1)
            expect(body).to.not.match(login2)
            done()
        })
    })

    it('fetches user marydoe correctly',(done)=>{
        request('http://localhost:10002/marydoe',(err,res,body)=>{
            expect(err).to.be.equal(null)
            expect(res.statusCode).to.equal(200)
            expect(body).to.match(userRegex('marydoe'))
            expect(body).to.match(logoutRegex)

            expect(body).to.not.match(login1)
            expect(body).to.not.match(login2)
            done()
        })
    })

    it('fetches non logged in correctly',(done)=>{
        request('http://localhost:10002/notLoggedIn',(err,res,body)=>{
            expect(err).to.be.equal(null)
            expect(res.statusCode).to.equal(200)
            expect(body).to.not.match(userRegex('marydoe'))
            expect(body).to.not.match(userRegex('bobjane'))
            expect(body).to.not.match(logoutRegex)

            expect(body).to.match(login1)
            expect(body).to.match(login2)
            done()
        })
    })

    it('if no params are provided, the fetches normally',(done)=>{
        request('http://localhost:10002/nothingProvided',(err,res,body)=>{
            expect(err).to.be.equal(null)
            expect(res.statusCode).to.equal(200)

            expect(body).to.not.match(userRegex('marydoe'))
            expect(body).to.not.match(userRegex('bobjane'))

            expect(body).to.not.match(login1)
            expect(body).to.not.match(login2)

            done()
        })
    })
})