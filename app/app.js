'use strict';

const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
//const favicon = require('serve-favicon');
const debug = require('debug')('microdraw:server');
const https = require('https');
const http = require('http');
const morgan = require('morgan');
const nwl = require('neuroweblab');
const microdrawWebsocketServer = require('./controller/microdrawWebsocketServer/microdrawWebsocketServer.js');
const routes = require('./routes/routes');
let port;
let server;

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

// eslint-disable-next-line max-statements
const start = async function () {
  const app = express();

  port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  // Create HTTP server.
  server = http.createServer(app);

  // Listen on provided port, on all network interfaces.
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);

  const Config = JSON.parse(await fs.promises.readFile('./cfg.json'));
  microdrawWebsocketServer.dataDirectory = path.join(__dirname, '/public');

  if (Config.secure) {
    const options = {
      key: await fs.promises.readFile(Config.ssl_key),
      cert: await fs.promises.readFile(Config.ssl_cert)
    };
    if (Config.ssl_chain) {
      options.ca = await fs.promises.readFile(Config.ssl_chain);
    }
    microdrawWebsocketServer.server = https.createServer(options, app);
  } else {
    microdrawWebsocketServer.server = http.createServer(app);
  }

  const wsServer = microdrawWebsocketServer.server.listen(8080, () => {
    if (Config.secure) {
      console.log('Listening wss on port 8080');
    } else {
      console.log('Listening ws on port 8080');
    }
    microdrawWebsocketServer.initSocketConnection();
  });


  // CORS
  app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*'); // 'http://localhost:8888');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
  });

  // uncomment after placing your favicon in /public
  //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
  app.use(bodyParser.json({ limit: '50mb', extended: true }));
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
  await nwl.init({
    app,
    MONGO_DB: process.env.MONGODB_TEST || process.env.MONGODB || '127.0.0.1:27017/microdraw',
    dirname: path.join(__dirname, "/auth/"),
    usernameField: "username",
    usersCollection: "users",
    projectsCollection: "projects",
    annotationsCollection: "annotations"
  });
  global.authTokenMiddleware = nwl.authTokenMiddleware;

  /* setup GUI routes */
  routes(app);


  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    console.log('ERROR: File not found', req.url);
    var err = new Error('Not Found', req);
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

  return { app, server, wsServer };
};

module.exports = { start };
