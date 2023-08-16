/* eslint-disable camelcase */
/* eslint-disable radix */
// const async = require('async');
const dateFormat = require('dateformat');
const { AccessControlService } = require('neuroweblab');
//const checkAccess = require('../checkAccess/checkAccess.js');
//const dataSlices = require('../dataSlices/dataSlices.js');

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

const user = function (req, res) {
  const username = req.params.userName;

  // Store return path in case of login
  req.session.returnTo = req.originalUrl;

  req.appConfig.db.queryUser({username})
    .then((json) => {
      if (json) {
        const context = {
          username, // json.name,
          // nickname: json.nickname,
          joined: dateFormat(json.joined, 'dddd d mmm yyyy, HH:MM'),
          avatar: json.avatarURL,
          title: json.name,
          userInfo: JSON.stringify(json),
          tab: req.query.tab || 'data',
          loggedUser: JSON.stringify(req.user || null)
        };
        res.render('user', context);
      } else {
        res.status(404).send('User Not Found');
      }
    })
    .catch((err) => {
      console.log('ERROR:', err);
      res.status(400).send('Error');
    });
};

const api_user = function (req, res) {
  req.appConfig.db.queryUser({username: req.params.userName, backup: {$exists: false}})
    .then((json) => {
      if (json) {
        if (req.query.var) {
          let i;
          const arr = req.query.var.split('/');
          for (i of arr) {
            json = json[arr[i]];
          }
        }
        res.send(json);
      } else {
        res.send();
      }
    });
};

const api_userAll = function (req, res) {
  console.log('api_userAll');
  if (!req.query.page) {
    res.json({error: 'The \'pages\' parameter has to be specified'});

    return;
  }

  const page = parseInt(req.query.page);
  const nItemsPerPage = 20;

  req.appConfig.db.queryAllUsers({backup: {$exists: false}}, {skip: page * nItemsPerPage, limit: nItemsPerPage, fields: {_id: 0}})
    .then((array) => {
      res.send(array.map((o) => o.username));
    });
};


/**
 * @todo Check access rights for this route
 */

/**
 * @param {object} req Request object
 * @param {object} res Response object
 * @returns {void}
 */
const api_userFiles = function (req, res) {
  const {userName} = req.params;
  const start = parseInt(req.query.start);
  const length = parseInt(req.query.length);

  console.log('userName:', userName, 'start:', start, 'length:', length);
  res.send({
    success:true,
    message:'WARNING: THIS FUNCTION IS NOT YET IMPLEMENTED',
    list: [
      {name: 'test1', dimensions: '3000x2000x200', included: 'yes'},
      {name: 'test2', dimensions: '4000x3000x300', included: 'yes'},
      {name: 'test3', dimensions: '5000x4000x400', included: 'yes'}
    ]
  });

  /*
    dataSlices.getUserFilesSlice(req, userName, start, length)
    .then(result => {
        res.send(result);
    })
    .catch(err => {
        console.log('ERROR:', err);
        res.send({success: false, list: []});
    });
    */
};

/**
 * @todo Check access rights for this route
 */

/**
 * @param {object} req Request object
 * @param {object} res Response object
 * @returns {void}
 */
const api_userAtlas = function (req, res) {
  const {userName} = req.params;
  const start = parseInt(req.query.start);
  const length = parseInt(req.query.length);

  console.log('userName:', userName, 'start:', start, 'length:', length);
  res.send({
    successful: true,
    message: "WARNING: THIS FUNCTIONALITY IS NOT YET IMPLEMENTED",
    list: [
      {parent: 'Test 1', name: 'test 1', project: 'testproject1', lastModified: (new Date()).toJSON()},
      {parent: 'Test 2', name: 'test 2', project: 'testproject2', lastModified: (new Date()).toJSON()}
    ]
  });

  /*
    dataSlices.getUserAtlasSlice(req, userName, start, length)
    .then(result => {
        res.send(result);
    })
    .catch(err => {
        console.log('ERROR:', err);
        res.send({success: false, list: []});
    });
    */
};

/**
 * @todo Check access rights for this route
 */

/**
 * @param {object} req Request object
 * @param {object} res Response object
 * @returns {void}
 */
const api_userProjects = function (req, res) {
  const {userName} = req.params;
  // const start = parseInt(req.query.start);
  // const length = parseInt(req.query.length);
  const loggedUser = req.user ? req.user.username : 'anyone';

  req.appConfig.db.queryUserProjects(userName).then((result) => {
    const filteredList = result.filter((project) =>
      AccessControlService.canViewFiles(project, loggedUser)
    );
    res.send({
      successful: true,
      list: filteredList
    });
  });
};

module.exports = {
  validator,
  api_user,
  api_userAll,
  api_userFiles,
  api_userAtlas,
  api_userProjects,
  user
};
