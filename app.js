'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');

//var mongo = require('mongodb');
var monk = require('monk');
var MONGO_DB;

var DOCKER_DB = process.env.DB_PORT;
//var DOCKER_DEVELOP = process.env.DEVELOP;
if ( DOCKER_DB ) {
    MONGO_DB = DOCKER_DB.replace( 'tcp', 'mongodb' ) + '/microdraw';
} else {
    MONGO_DB = 'localhost:27017/microdraw'; //process.env.MONGODB;
}
var db = monk(MONGO_DB);
var fs = require('fs');

var dirname = __dirname; // local directory

//var index = require('./routes/index');

var app = express();
app.engine('mustache', mustacheExpress());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//{-----passport
var session = require('express-session');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
passport.use(new GithubStrategy(
    JSON.parse(fs.readFileSync(dirname + "/github-keys.json")),
    function (accessToken, refreshToken, profile, done) { return done(null, profile); }
));
app.use(session({
    secret: "a mi no me gusta la sémola",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// add custom serialization/deserialization here (get user from mongo?) null is for errors
passport.serializeUser(function (user, done) { done(null, user); });
passport.deserializeUser(function (user, done) { done(null, user); });
// Simple authentication middleware. Add to routes that need to be protected.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}
app.get('/secure-route-example', ensureAuthenticated, function (req, res) { res.send("access granted"); });
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect(req.session.returnTo || '/');
    delete req.session.returnTo;
});
app.get('/loggedIn', function loggedIn(req, res) {
    if (req.isAuthenticated()) {
        res.send({loggedIn: true, username: req.user.username});
    } else {
        res.send({loggedIn: false});
    }
});
// start the GitHub Login process
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/'}),
    function (req, res) {
        // successfully loged in. Check if user is new
        db.get('user').findOne({nickname: req.user.username}, "-_id")
            .then(function (json) {
                if (!json) {
                    // insert new user
                    json = {
                        name: req.user.displayName,
                        nickname: req.user.username,
                        url: req.user._json.blog,
                        brainboxURL: "/user/" + req.user.username,
                        avatarURL: req.user._json.avatar_url,
                        joined: (new Date()).toJSON()
                    };
                    db.get('user').insert(json);
                } else {
                    console.warn("Update user data from GitHub");
                    db.get('user').update({nickname: req.user.username}, {$set:{
                        name: req.user.displayName,
                        url: req.user._json.blog,
                        avatarURL: req.user._json.avatar_url
                    }});
                }
            });
            res.redirect(req.session.returnTo || '/');
            delete req.session.returnTo;
    });
//-----}


// GUI routes
app.get('/', function (req, res) { // /auth/github
    var login = (req.isAuthenticated()) ?
                ("<a href='/user/" + req.user.username + "'>" + req.user.username + "</a> (<a href='/logout'>Log Out</a>)")
                : ("<a href='/auth/github'>Log in with GitHub</a>");

    // store return path in case of login
    req.session.returnTo = req.originalUrl;

    res.render('index', {
        title: 'MicroDraw',
        login: login
    });
});

app.use('/data', require('./controller/data/'));

// API routes
app.get('/api', function (req, res) {
    console.warn("call to GET api");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous"; // eslint-disable-line no-unused-vars
    console.warn(req.query);
    db.get('data').findOne({
        source: req.query.source,
        slice: req.query.slice,
        key: req.query.key,
        backup: {$exists: false}
    })
    .then(function(obj) {
        if(obj) {
            res.send(obj.value);
        } else {
            res.send();
        }
    })
    .catch(function(err) {
        console.error("ERROR", err);
        res.send({error:JSON.stringify(err)});
    });
});
app.post('/api', function (req, res) {
    console.warn("call to POST api");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous";
    var {body: body} = req;
    switch(body.action) {
        case 'save':
            var { source: source, slice: slice, key: key } = body;
            console.log("blib",source, slice, key);
            var value = JSON.parse(body.value);
            // mark previous version as backup
            db.get('data').update({
                source: source,
                backup: {$exists: false}
            }, {
                $set:{backup: true}
            }, {
                multi:true
            })
            .then(function() {
                // insert new version
                db.get('data').insert({
                    user: loggedUser,
                    source: source,
                    slice: slice,
                    key: key,
                    value: value
                });
            });
            break;
    }
    res.send({});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
