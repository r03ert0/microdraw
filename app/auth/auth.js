const session = require('express-session')
const passport = require('passport')
const SESSION_SECRETE = process.env.SESSION_SECRETE || 'a mi no me gusta la sémola'

const github = require('./github')
const local = require('./local')

/* middle to ensure authenticated */
const ensureAuthenticated = (req,res,next)=>{
    if(req.isAuthenticated()){
        return next()
    }

    /* or login page (?) */
    res.redirect('/')
}

module.exports = (app)=>{
    console.log(`loading auth module`)
    app.use(session({
        secret : SESSION_SECRETE,
        resave : false,
        saveUninitialized : false
    }))
    app.use(passport.initialize())
    app.use(passport.session())

    passport.serializeUser((user,done)=>{

        /* put id in session, for easy deserialzisation */
        done(null,user.username)
    })

    passport.deserializeUser((username,done)=>{

        /* retrieve id from mongo */
        app.db.queryUser({ username })
            .then(user=>done(null,user))
            .catch(e=>done(e,null))
    })

    app.get('/logout',(req,res)=>{
        req.logout()
        res.redirect(req.session.returnTo || '/')
        delete req.session.returnTo
    })

    /* Strategies */

    /* uncommend to include local signin strategy */
    /* or any other strategy you may like to include */

    github(app)
    // local(app)

    app.set('loginMethods',[{
        url : '/auth/github',
        text : 'Log in with GitHub'
    // },{
    //     url : '/html/localsignin.html',
    //     text: 'Log in locally'
    }])

    /* TODO simple a demo */
    app.get('/secure-route-example', ensureAuthenticated, function (req, res) { res.send("access granted"); });

    /* TODO use reflection */
    app.get('/loggedIn', (req, res) => {
        if (req.isAuthenticated()) {
            res.send({loggedIn: true, username: req.user.username});
        } else {
            res.send({loggedIn: false});
        }
    })


}