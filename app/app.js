'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
//const favicon = require('serve-favicon');

const app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
if (process.env.NODE_ENV !== 'production') {
  app.use(require('morgan')('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


/* setup DB */
var checkAnyoneUser = function () {

  /* check that the 'anyone' user exists. Insert it if it doesn't */
  db.queryUser({username: 'anyone'})
    .then((res) => {
      console.log('"anyone" user correctly configured.', res);
    })
    .catch((err) => {
      console.log('"anyone" user absent: adding one.', err);
      const anyone = {
        username: 'anyone',
        nickname: 'anyone',
        name: 'Any User',
        joined: (new Date()).toJSON()
      };
      db.addUser(anyone);
    });
};
const db = require('./db/db')(null, checkAnyoneUser);
app.db = db;

/* setup authentication */
require('./auth/auth')(app);

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
