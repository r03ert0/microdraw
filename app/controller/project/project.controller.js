/* eslint-disable radix */
/* eslint-disable no-plusplus */
// const async = require('async');
// const dateFormat = require('dateformat');
// const checkAccess = require('../checkAccess/checkAccess.js');
// const dataSlices = require('../dataSlices/dataSlices.js');
const _ = require('lodash');
const { AccessControlService, AccessLevel } = require('neuroweblab');
const validator = function (req, res, next) {
  next();
};

const project = async function (req, res) {
  const login = (req.user) ?
    ('<a href=\'/user/' + req.user.username + '\'>' + req.user.username + '</a> (<a href=\'/logout\'>Log Out</a>)') :
    ('<a href=\'/auth/github\'>Log in with GitHub</a>');
  const requestedProject = req.params.projectName;
  let loggedUser = "anyone";
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  // Store return path in case of login
  req.session.returnTo = req.originalUrl;
  try {
    const json = await req.appConfig.db.queryProject({shortname: requestedProject});
    console.log('requestedProject', requestedProject);
    if (json) {
      if (!AccessControlService.canViewFiles(json, loggedUser)) {
        res.status(403).send('Not authorized to view project');
        return;
      }
      const context = {
        projectShortname: json.shortname,
        projectInfo: JSON.stringify(json),
        login
      };
      res.render('project', context);
    } else {
      res.status(404).send('Project Not Found');
    }
  } catch(err) {
    console.log('ERROR:', err);
    res.status(400).send('Error');
  }
};

/**
 * @desc Render the settings page GUI
 * @param {Object} req Req object from express
 * @param {Object} res Res object from express
 * @returns {void}
 */
var settings = async function(req, res) {
  console.log("Settings");
  var login = (req.isAuthenticated()) ?
    ("<a href='/user/" + req.user.username + "'>" + req.user.username + "</a> (<a href='/logout'>Log Out</a>)")
    : ("<a href='/auth/github'>Log in with GitHub</a>");
  const requestedProject = req.params.projectName;

  var loggedUser = "anyone";
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  req.session.returnTo = req.originalUrl;

  const json = await req.appConfig.db.queryProject({shortname: requestedProject});
  if(typeof json === 'undefined') {
    json = {
      name: "",
      shortname: requestedProject,
      url: "",
      created: (new Date()).toJSON(),
      owner: loggedUser,
      collaborators: {
        list: [
          {
            username: 'anyone',
            access: {
              collaborators: 'view',
              annotations: 'edit',
              files: 'view'
            }
          }
        ]
      },
      files: {
        list: []
      },
      annotations: {
        list: []
      }
    };
  }

  if (!AccessControlService.canViewFiles(json, loggedUser)) {
    res.status(403).send('Not authorized to view project');
    return;
  }

  // @todo empty the files.list because it will be filled progressively from the client
  // json.files.list = [];

  // find username and name for each of the collaborators in the project
  if (AccessControlService.canViewCollaborators(json, loggedUser)) {
    const arr1 = [];
    for(let j=0; j<json.collaborators.list.length; j++) {
      if (Object.keys(json.collaborators.list[j]).includes("username") === false) {

        return res.send("Error with user in project. Contact the adminstrators at https://mattermost.brainhack.org/brainhack/channels/microdraw").status(500);
      }

      arr1.push(req.appConfig.db.queryUser({username: json.collaborators.list[j].username}));
    }

    const collaboratorsList = await Promise.all(arr1);
    for(let j=0; j<collaboratorsList.length; j++) {
      if(collaboratorsList[j]) { // name found
        json.collaborators.list[j].name=collaboratorsList[j].name;
      } else { // name not found: set to empty
        json.collaborators.list[j].name = "";
      }
    }
  } else {
    json.collaborators.list = json.collaborators.list.filter((collaborator) => collaborator.username === 'anyone');
  }

  var context = {
    projectShortname: json.shortname,
    owner: json.owner,
    projectInfo: JSON.stringify(json),
    login: login
  };
  res.render('projectSettings', context);
};

/**
 * @function projectNew
 * @desc Render the page with the GUI for entering a new project
 * @param {Object} req Req object from express
 * @param {Object} res Res object from express
 * @returns {void}
 */
const projectNew = function (req, res) {
  console.log("New Project");

  const login = (req.user) ?
    ('<a href=\'/user/' + req.user.username + '\'>' + req.user.username + '</a> (<a href=\'/logout\'>Log Out</a>)') :
    ('<a href=\'/auth/github\'>Log in with GitHub</a>');
  let loggedUser = "anyone";
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else
  if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  // Store return path in case of login
  req.session.returnTo = req.originalUrl;

  if(loggedUser === "anyone" ) {
    res.render('askForLogin', {
      title: "MicroDraw: New Project",
      functionality: "create a new project",
      login: login
    });
  } else {
    res.render('projectNew', {
      title: "MicroDraw: New Project",
      login: login
    });
  }
};

const apiProject = async function (req, res) {
  console.log("GET project", req.params);
  const json = await req.appConfig.db.queryProject({shortname: req.params.projectName, backup: {$exists: false}});
  if (_.isNil(json)) {
    res.status(404).json({error: 'Project not found'});
    return;
  }

  let loggedUser = "anyone";
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  if (!AccessControlService.canViewFiles(json, loggedUser)) {
    res.status(403).json({error: 'Not authorized to view project'});
    return;
  }

  if (!AccessControlService.canViewCollaborators(json, loggedUser)) {
    json.collaborators.list = json.collaborators.list.filter(collaborator => collaborator.username === 'anyone');
  }

  if (!AccessControlService.canViewAnnotations(json, loggedUser)) {
    json.annotations.list = [];
  }

  if (req.query.var) {
    let i;
    const arr = req.query.var.split('/');
    for (i in arr) {
      if({}.hasOwnProperty.call(arr, i)) {
        json = json[arr[i]];
      }
    }
  }
  res.send(json);
};

const apiProjectAll = function (req, res) {
  console.log('api_projectAll');
  if (!req.query.page) {
    res.json({error: 'The \'pages\' parameter has to be specified'});

    return;
  }

  const page = parseInt(req.query.page);
  const nItemsPerPage = 20;

  req.appConfig.db.queryAllProjects({backup: {$exists: false}}, {skip: page * nItemsPerPage, limit: nItemsPerPage, fields: {_id: 0}})
    .then((array) => {
      res.send(array.map((o) => o.shortname ));
    });
};

/**
 * @function apiProjectFiles
 */

/**
 * @todo Check access rights for this route
 */

const apiProjectFiles = function (req, res) {
  const {projectName} = req.params;
  const start = parseInt(req.query.start);
  const length = parseInt(req.query.length);

  console.log('projectName:', projectName, 'start:', start, 'length:', length);
  res.send({});
};

const postProject = async function (req, res) {
  let loggedUser = 'anonymous';
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  if (loggedUser === 'anonymous') {
    res.status(403).json({ error: 'error', message: 'User not authenticated' });

    return;
  }

  const newProject = typeof req.body.data === "string" ? JSON.parse(req.body.data): req.body.data;
  const oldProject = await req.appConfig.db.queryProject({shortname: newProject.shortname});

  if (!AccessControlService.hasFilesAccess(AccessLevel.EDIT, oldProject, loggedUser)) {
    res.status(403).json({ error: 'error', message: 'User does not have edit rights' });

    return;
  }

  const ignoredChanges = AccessControlService.preventUnauthorizedUpdates(newProject, oldProject, loggedUser);
  let successMessage = "Project settings updated.";
  if(ignoredChanges.length > 0) {
    successMessage += ` Some changes (on ${ignoredChanges.join(', ')}) were ignored due to a lack of permissions.`;
  }

  req.appConfig.db.upsertProject(newProject)
    .then((o) => { console.log('postProject', o); res.send({success: true, response: o, message: successMessage}); })
    .catch((e) => res
      .send(e)
      .status(500)
      .end());
};

const deleteProject = async function (req, res) {
  console.log("DELETE Project");

  let loggedUser = 'anonymous';
  if(req.isAuthenticated()) {
    loggedUser = req.user.username;
  } else if(req.isTokenAuthenticated) {
    loggedUser = req.tokenUsername;
  }

  // Store return path in case of login
  req.session.returnTo = req.originalUrl;

  if(loggedUser === 'anonymous') {
    res
      .status(403)
      .send({message: "Log in required"})
      .end();
  } else {
    const {projectName} = req.params;

    const project = await req.appConfig.db.queryProject({shortname: projectName});
    if (!AccessControlService.hasFilesAccess(AccessLevel.REMOVE, project, loggedUser)) {
      console.log('WARNING: user does not have remove rights');
      res.status(403).json({ success: false, message: 'The user is not allowed to delete this project' });

      return;
    }

    req.appConfig.db.deleteProject({shortname: projectName})
      .then((o) => {
        console.log('DELETE Project', o);
        res.send({success: true, response: o});
      })
      .catch((e) => res
        .send(e)
        .status(403)
        .end());
  }
};

module.exports = {
  validator,
  apiProject,
  apiProjectAll,
  apiProjectFiles,
  project,
  projectNew,
  settings,
  postProject,
  deleteProject
};
