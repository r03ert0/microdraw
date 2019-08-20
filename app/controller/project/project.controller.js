// const async = require('async');
const dateFormat = require('dateformat');
//const checkAccess = require('../checkAccess/checkAccess.js');
//const dataSlices = require('../dataSlices/dataSlices.js');

const validator = function (req, res, next) {
    next();
};

const project = function (req, res) {
    const login = (req.user) ?
                ('<a href=\'/user/' + req.user.username + '\'>' + req.user.username + '</a> (<a href=\'/logout\'>Log Out</a>)') :
                ('<a href=\'/auth/github\'>Log in with GitHub</a>');
    const requestedProject = req.params.projectName;

    // Store return path in case of login
    req.session.returnTo = req.originalUrl;

    req.appConfig.db.queryProject({shortname: requestedProject})
        .then((json) => {
            if (json) {
                const context = {
                    projectShortname: json.shortname,
                    projectInfo: JSON.stringify(json),
                    login
                };
                res.render('project', context);
            } else {
                res.status(404).send('Project Not Found');
            }
        })
        .catch((err) => {
            console.log('ERROR:', err);
            res.status(400).send('Error');
        });
};

/**
 * @function settings
 * @desc Render the settings page GUI
 * @param {Object} req Req object from express
 * @param {Object} res Res object from express
 * @returns {void}
 */
var settings = function(req, res) {
    console.log("Settings");
    var login = (req.isAuthenticated()) ?
                ("<a href='/user/" + req.user.username + "'>" + req.user.username + "</a> (<a href='/logout'>Log Out</a>)")
                : ("<a href='/auth/github'>Log in with GitHub</a>");
    const requestedProject = req.params.projectName;

    var loggedUser = "anonymous";
    if(req.isAuthenticated()) {
        loggedUser = req.user.username;
    } else
    if(req.isTokenAuthenticated) {
        loggedUser = req.tokenUsername;
    }

    // store return path in case of login
    req.session.returnTo = req.originalUrl;

    req.appConfig.db.queryProject({shortname: requestedProject})
    .then(function(json) {
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
                            userID: 'anyone',
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

        // @todo empty the files.list because it will be filled progressively from the client
        // json.files.list = [];

        // find username and name for each of the collaborators in the project
        let j;
        const arr1 = [];
        for(j=0; j<json.collaborators.list.length; j++) {
            arr1.push(req.appConfig.db.queryUser({username: json.collaborators.list[j].userID}));
        }

        Promise.all(arr1)
        .then(function(obj) {
            var j;
            for(j=0;j<obj.length;j++) {
                // @todo Pick one between userID, username and nickname...
                json.collaborators.list[j].username=json.collaborators.list[j].userID;
                if(obj[j]) { // name found
                    json.collaborators.list[j].name=obj[j].name;
                } else { // name not found: set to empty
                    json.collaborators.list[i].name="";
                }
            }
            var context = {
                projectShortname: json.shortname,
                owner: json.owner,
                projectInfo: JSON.stringify(json),
                login: login
            };
            res.render('projectSettings', context);
        })
        .catch((e) => console.log("Error:", e));
    })
    .catch((e) => console.log("Error:", e));
};

/**
 * @function projectNew
 * @desc Render the page with the GUI for entering a new project
 * @param {Object} req Req object from express
 * @param {Object} res Res object from express
 * @returns {void}
 */
const projectNew = function (req, res) {
    const login = (req.user) ?
                ('<a href=\'/user/' + req.user.username + '\'>' + req.user.username + '</a> (<a href=\'/logout\'>Log Out</a>)') :
                ('<a href=\'/auth/github\'>Log in with GitHub</a>');

    console.log("New Project");

    // Store return path in case of login
    req.session.returnTo = req.originalUrl;

    const context = {
        projectname: "Microdraw: New Project",
        login
    };
    res.render('projectNew', context);
};

const apiProject = function (req, res) {
    req.appConfig.db.queryProject({projectname: req.params.projectname, backup: {$exists: false}})
        .then((json) => {
            if (json) {
                if (req.query.var) {
                    let i;
                    const arr = req.query.var.split('/');
                    for (i in arr) {
                        json = json[arr[i]];
                    }
                }
                res.send(json);
            } else {
                res.send();
            }
        });
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
            res.send(array.map((o) => o.projectname ));
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

const postProject = function (req, res) {
    // const {projectName} = req.params;
    // const {username} = req.user;
    const projectInfo = JSON.parse(req.body.data);

    req.appConfig.db.addProject(projectInfo);
}

const projectController = function () {
    this.validator = validator;
    this.apiProject = apiProject;
    this.apiProjectAll = apiProjectAll;
    this.apiProjectFiles = apiProjectFiles;
    this.project = project;
    this.projectNew = projectNew;
    this.settings = settings;
    this.postProject = postProject; 
};

module.exports = new projectController();
