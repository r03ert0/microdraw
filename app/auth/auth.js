const session = require('express-session')
const passport = require('passport')
const MongoStore = require('connect-mongo')(session)
const SESSION_SECRET = process.env.SESSION_SECRET || 'a mi no me gusta la sémola'

const github = require('./github')
const local = require('./local')

const MONGODB = process.env.MONGODB || process.env.MONGODB_TEST_DEFAULT || '127.0.0.1:27017/microdraw'

const _URL = (MONGODB.slice(0,10) === 'mongodb://'
        ? ''
        : 'mongodb://') + 
        MONGODB

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
        secret : SESSION_SECRET,
        resave : false,
        saveUninitialized : false,
        store: new MongoStore({
            url : _URL
        })
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

    app.set('loginMethods',[])

    github(app)
    if(process.env.LOCALSIGNIN && process.env.LOCALSIGNIN === 'true') local(app)

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