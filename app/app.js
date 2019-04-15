'use strict';
/*eslint no-console: ["error", { allow: ["warn", "error"] }] */

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
//const favicon = require('serve-favicon');

const app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
if (process.env.NODE_ENV === 'development') {
    app.use(logger('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* setup DB */
const db = require('./db/db')()
app.db = db

/* setup authentication */
require('./auth/auth')(app)

/* setup token authentication */
require('./auth/token'); //(app);

/* setup GUI routes */
require('./routes/routes')(app)


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
