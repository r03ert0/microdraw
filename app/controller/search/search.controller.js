/* eslint-disable camelcase */
// const async = require('async');
// const dateFormat = require('dateformat');
// const checkAccess = require('../checkAccess/checkAccess.js');
// const dataSlices = require('../dataSlices/dataSlices.js');

const validator = function (req, res, next) {
  // UserName can be an ip address (for anonymous users)

  /*
    req.checkParams('userName', 'incorrect user name').isAlphanumeric();
    var errors = req.validationErrors();
    console.log(errors);
    if (errors) {
        res.send(errors).status(403).end();
    } else {
        return next();
    }
    */
  next();
};

const api_searchUsers = function (req, res) {
  req.appConfig.db.searchUsers({q: req.query.q})
    .then((o) => { res.send(JSON.stringify(o)); })
    .catch((e) => res.send(e)
      .status(403)
      .end());
};

const api_searchProjects = function (req, res) {
  req.appConfig.db.searchProjects({q: req.query.q})
    .then((o) => { res.send(JSON.stringify(o)); })
    .catch((e) => res.send(e)
      .status(403)
      .end());
};

module.exports = {
  validator,
  api_searchUsers,
  api_searchProjects
};
