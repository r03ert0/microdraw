const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const md5 = require('md5')

const saltRounds = 10

module.exports = (app)=>{

  passport.use(new LocalStrategy(
    (username,password,done)=>{
      console.log('querying db')
      app.db.queryUser({
        username 
      })
        .then(user=>{
          done(null, user ? 
            user.password === md5(password) ?
              user :
              false :
            false)

          /* bcrypt -> more secure */
          // bcrypt.compare(password,user.passhash)
          //   .then(res=>done(null,res ? user : false))
          //   .catch(e=>done(e))
        })
        .catch(e=>{
          console.log(JSON.stringify(e))
          done(null,false)
        })
    }
  ))

  app.post(
    '/localLogin',
    passport.authenticate('local',{
      failureRedirect : '/html/localsignin.html'
    }),
    (req,res)=>{
      res.redirect(301,req.session.returnTo || '/')
      delete req.session.returnTo
    })

  app.post('/localSignup', (req,res)=>{
    console.log(req.body)
    res.status(404)

    /* bcrypt more secrure */
    // bcrypt.hash(req.body.password,saltRounds,(err,hash)=>{
    //   if(err) res.status(500).send(err)
    //   else {

    //     /* save req.body.username & hash */
    //     app.db.addUser({
    //       strategy : 'local',
    //       username : req.body.username,
    //       passhash : hash
    //     })
    //     res.status(200)
    //   }
    // })
  })
}