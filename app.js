'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');
var fetch = require('node-fetch');
var url = require('url')
var fs = require('fs');

var dirname = __dirname; // local directory
var serverConfig;

// Check if .example files have been instantiated
// Server-side
if( fs.existsSync(dirname + '/server_config.json') === false ) {
    console.error("ERROR: The file server_config.json is not present.");
    console.error("Maybe server_config.json.example was not instantiated?");
    process.exit(1);
}
if( fs.existsSync(dirname + '/github-keys.json') === false ) {
    console.error("ERROR: The file github-keys.json is not present.");
    console.error("Maybe github-keys.json.example was not instantiated?");
    process.exit(1);
}
// Client-side
if( fs.existsSync(dirname + '/public/js/base.js') === false ) {
    console.error("ERROR: The file /public/js/base.js is not present.");
    console.error("Maybe /public/js/base.js.example was not instantiated?");
    process.exit(1);
}
if( fs.existsSync(dirname + '/public/js/configuration.json') === false ) {
    console.error("ERROR: The file /public/js/configuration.json is not present.");
    console.error("Maybe /public/js/configuration.json.example was not instantiated?");
    process.exit(1);
}

serverConfig = JSON.parse(fs.readFileSync(dirname + '/server_config.json'));

var monk = require('monk');
var MONGO_DB;

var DOCKER_DB = process.env.DB_PORT;
//var DOCKER_DEVELOP = process.env.DEVELOP;
if ( DOCKER_DB ) {
    MONGO_DB = DOCKER_DB.replace( 'tcp', 'mongodb' ) + '/microdraw';
} else {
    MONGO_DB = process.env.MONGODB || 'medpc055.ime.kfa-juelich.de:27017/json_db'; //process.env.MONGODB;
}
var db = monk(MONGO_DB);
db
    .then( function () {
        console.log('Connected correctly to mongodb');
    })
    .catch( function (e) {
        console.error('Failed to connect to mongodb',e)
        process.exit(1)
    })

//var index = require('./routes/index');

var app = express();
app.engine('mustache', mustacheExpress());

/* hack until roberto merges fix windows symlink PR */
const isWin = !fs.statSync(dirname + '/public/lib/openseadragon').isDirectory()
if( isWin ){
    console.warn('Dev machine does not recognise symlinks ... or a windows machine touched this repo ...')
    var reroute = ['/lib/openseadragon/','/lib/FileSaver.js/','/lib/openseadragon-screenshot/']
    reroute.forEach(file=>{
        var readFile = fs.readFileSync(dirname+'/public'+file,'utf8')
        app.get(file+'*',(req,res)=>{
            res.sendFile(req.path.replace(file,readFile+'/'),{root:path.join(dirname,'public/lib')})
        })
    })
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
if (process.env.NODE_ENV === 'development') {
    app.use(logger('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//{-----passport
var session = require('express-session');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var warningGithubConfig = false;
fs.readFile("github-keys.json", "utf8", (err, githubKeys) => {
    if (err) {
        console.warn('github-keys.json does not exist. Users would not be able to be authenticated ...', err);
        warningGithubConfig = true;
    }else{
        try{
            passport.use(new GithubStrategy( JSON.parse(githubKeys),
            (accessToken, refreshToken, profile, done) => done(null, profile)));
        }catch (e) {
            console.warn('parsing githubkey.json or passport.use(new GithubStrategy) error', e);
            warningGithubConfig = true;
        }
    }
});

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

app.use('/data', (req, res, next) => {
    req.warningGithubConfig = warningGithubConfig;
    next();
}, require('./controller/data/'));

app.get('/getTile',function (req,res){
    fetch(req.query.source)
        .then(img=>img.body.pipe(res))
        .catch(e=>{
            console.log('getTile api broken',e);
            res.sendStatus(500)
        });
})

app.get('/getJson',function (req,res) {
    var { source } = req.query;

    var thisHostname = req.protocol + '://' + req.get('host')
    console.log('thishostname',thisHostname)
    var sourceHostname = 
        !source ? 
            null : 
            (new RegExp('^http')).test(source) ? 
                url.parse(source).protocol + '//' + url.parse(source).host : 
                req.protocol + '://' + req.hostname;
    var sourcePath = url.parse(source).path ? url.parse(source).path : null;
    (new Promise((resolve,reject)=>{
        if( sourceHostname && sourcePath ){
            fetch(sourceHostname + sourcePath)
                .then(data=>resolve(data))
                .catch(e=>reject(e));
        }else{
            reject('sourceurl not defined');
        }
    }))
        .then(data=>data.json())
        .then(json=>{
            json.tileSources = json.tileSources.map(tileSource=>(new RegExp('^http')).test(tileSource) ? tileSource : tileSource[0] == '/' ? thisHostname + '/getTile?source=' + sourceHostname + tileSource : thisHostname + '/getTile?source=' + sourceHostname +  '/'+ tileSource );
            res.send(JSON.stringify(json));
        })  
        .catch(e=>{
            console.log('error'+e)
            res.sendStatus(404);
        })
})

// API routes
app.get('/api', function (req, res) {
    console.warn("call to GET api");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous"; // eslint-disable-line no-unused-vars
    db.get('annotations').find({
        fileID: req.query.fileID,
        user: loggedUser,
        deleted: {$exists: false}
    },{
        sort : {created_at : -1}
    })
    .then(function(arr) {
        if(arr) {
            const reducedArr = arr.reduce((acc,curr)=>
                acc.findIndex(el=>el.annotationID===curr.annotationID) < 0 ? [...acc,curr]:acc , [])
            res.send(reducedArr);
        } else {
            res.send([]);
        }
    })
    .catch(function(err) {
        console.error("ERROR", err);
        res.send({error:JSON.stringify(err)});
    });
});

const assignNewAnnotationID = () => Date.now()

app.post('/api', function (req, res) {
    console.warn("call to POST api");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous";
    switch(req.body.action) {
        case 'save':
            var annotations = JSON.parse(req.body.annotations);
            Promise.all(
                annotations
                    .filter(a => a.type === 'Region')
                    .map(a => 
                        db.get('annotations').insert({
                            fileID : a.fileID,
                            user : loggedUser,
                            type : a.type,
                            annotation : {
                                name : a.name,
                                path : a.path,
                                hash : a.hash
                            },
                            created_at : Date.now().toString()
                        }).then(item=>
                            db.get('annotations').findOneAndUpdate(
                                {_id : item._id},
                                {$set : { annotationID : a.annotationID ? a.annotationID : '' + item._id }}) //important to convert ObjectId to String
                        )))
                .then(arr=>res.send(arr))
                .catch(e=>res.sendStatus(500).send(JSON.stringify(e)))

                // saving each iteration of annotation separately
                /*
                if (typeof a.annotationID === 'undefined'){
                } else {

                }
                */

            break;
        case 'delete':
            console.log(req.body.annotationIDs)
            var annotationIDs = JSON.parse(req.body.annotationIDs);
            console.log('delete',annotationIDs)
            const allDeletions = annotationIDs.map(annotationID=>
                db.get('annotations').update({
                    annotationID : annotationID
                },{
                    $set:{deleted : true}
                },{
                    multi : true
                }))
            Promise.all(allDeletions)
                .then(arr=>res.send(arr))
                .catch(err=>{res.send({error:err});console.error('error',err)})
            break;
        case 'host':
            console.log(req.get('host'));
            break;
        case 'detente':
            process.exit();
            break;
    }
    // res.send({});
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
