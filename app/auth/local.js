const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

const saltRounds = 10

module.exports = (app)=>{

  passport.use(new LocalStrategy(
    (username,password,done)=>{
      app.db.queryUser({
        strategy : 'local',
        username 
      })
        .then(user=>{
          bcrypt.compare(password,user.passhash)
            .then(res=>done(null,res ? user : false))
            .catch(e=>done(e))
        })
        .catch(e=>done(e))
    }
  ))

  app.post(
    '/localLogin',
    passport.authenticate('local',{
      failureRedirect : '/'
    }),
    (req,res)=>{
      res.redirect(301,req.session.returnTo || '/')
      delete req.session.returnTo
    })

  app.post('/localSignup', (req,res)=>{
    console.log(req.body)
    bcrypt.hash(req.body.password,saltRounds,(err,hash)=>{
      if(err) res.status(500).send(err)
      else {

        /* save req.body.username & hash */
        app.db.addUser({
          strategy : 'local',
          username : req.body.username,
          passhash : hash
        })
        res.status(200)
      }
    })
  })
}