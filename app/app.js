/* eslint-disable global-require */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
//const favicon = require('serve-favicon');
const debug = require('debug')('microdraw:server');
const app = express();
var port;
var server;

//========================================================================================
// Configure server and web socket
//========================================================================================

// Normalize a port into a number, string, or false.
const normalizePort = function (val) {
  const tmpPort = parseInt(val, 10);
  // named pipe
  if (isNaN(tmpPort)) { return val; }
  // port number
  if (tmpPort >= 0) { return tmpPort; }

  return false;
};

// Event listener for HTTP server "error" event.
const onError = function (error) {
  if (error.syscall !== 'listen') { throw error; }
  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
  // handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    throw new Error(bind + ' requires elevated privileges');
  case 'EADDRINUSE':
    throw new Error(bind + ' is already in use');
  default:
    throw error;
  }
};

// Event listener for HTTP server "listening" event.
const onListening = function () {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
};

var https = require('https');
var http = require('http');

port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create HTTP server.
server = http.createServer(app);

// Listen on provided port, on all network interfaces.
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

const Config = JSON.parse(fs.readFileSync('./cfg.json'));
const microdrawWebsocketServer = require('./controller/microdrawWebsocketServer/microdrawWebsocketServer.js');
microdrawWebsocketServer.dataDirectory = path.join(__dirname, '/public');

if (Config.secure) {
  const options = {
    key: fs.readFileSync(Config.ssl_key),
    cert: fs.readFileSync(Config.ssl_cert)
  };
  if(Config.ssl_chain) {
    options.ca = fs.readFileSync(Config.ssl_chain);
  }
  microdrawWebsocketServer.server = https.createServer(options, app);
} else {
  microdrawWebsocketServer.server = http.createServer(app);
}

microdrawWebsocketServer.server.listen(8080, () => {
  if (Config.secure) {
    console.log('Listening wss on port 8080');
  } else {
    console.log('Listening ws on port 8080');
  }
  microdrawWebsocketServer.initSocketConnection();
});


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
if (process.env.NODE_ENV !== 'production') {
  app.use(require('morgan')('dev'));
}
app.use(bodyParser.json({limit: '50mb', extended: true}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


/* setup DB */
// var checkAnyoneUser = function () {

//   /* check that the 'anyone' user exists. Insert it if it doesn't */
//   db.queryUser({username: 'anyone'})
//     .then((res) => {
//       console.log('"anyone" user correctly configured.', res);
//     })
//     .catch((err) => {
//       console.log('"anyone" user absent: adding one.', err);
//       const anyone = {
//         username: 'anyone',
//         // nickname: 'anyone',
//         name: 'Any User',
//         joined: (new Date()).toJSON()
//       };
//       db.addUser(anyone);
//     });
// };
// const db = require('./db/db')(null, checkAnyoneUser);
// app.db = db;

/* setup authentication */
const nwl = require('neuroweblab');
nwl.init({
  app,
  MONGO_DB: process.env.MONGODB_TEST || process.env.MONGODB || '127.0.0.1:27017/microdraw',
  dirname: path.join(__dirname, "/auth/"),
  usernameField: "username",
  usersCollection: "users",
  projectsCollection: "projects",
  annotationsCollection: "annotations"
});
global.authTokenMiddleware = nwl.authTokenMiddleware;
const {db} = app;

/* setup GUI routes */
require('./routes/routes')(app);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log('ERROR: File not found', req.url);
  var err = new Error('Not Found', req);
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
