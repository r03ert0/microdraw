const monk = require('monk');
const MONGODB = process.env.MONGODB_TEST || process.env.MONGODB || '127.0.0.1:27017/microdraw';

// eslint-disable-next-line max-statements
module.exports = function(overwriteMongoPath, callback) {
    console.log(`connecting to mongodb at: ${overwriteMongoPath || MONGODB}`);

    const db = monk(overwriteMongoPath || MONGODB);
    let connected = false;

    /**
     * @returns {boolean} checks mongodb connection
     */
    const checkHealth = () => connected;

    /* add user */
    const addUser = (user) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('users').insert(user)
            .then(() => resolve(user))
            .catch((e) => reject(e));
    });

    const updateUser = (user) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('user').update({
            username: user.username
        }, {
            $set: user
        })
        .then(() => resolve(user))
        .catch(reject);
    });

    /* find user */
    const queryUser = (searchQuery) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('users').findOne(searchQuery)
            .then((user) => {
                if(user) {
                    resolve(user);
                } else {
                    reject({
                        message: 'error find one user',
                        result: user
                    });
                }
            })
            .catch(reject);
    });

    /* upsert user */
    const upsertUser = (user) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        queryUser({
            username : user.username
        })
            .then(() => updateUser(user))
            .then(resolve)
            .catch((e) => {
                if(e.message === 'error find one user') {
                    addUser(user)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(e);
                }
            });
    });

    /* query all users */
    const queryAllUsers = (pagination) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('users').find(pagination)
            .then((users) => {
                if(users) {
                    resolve(users);
                } else {
                    reject({message: 'error find all users', result: users});
                }
            })
            .catch((e) => reject(e));
    });

    /* add token */
    const addToken = (token) => new Promise((resolve, reject) => {
        db.get('log').insert(token)
        .then(() => resolve(token))
        .catch((e) => reject(e));
    });

    /* find token */
    const findToken = (token) => new Promise((resolve, reject) => {
        db.get('log').findOne({token})
        .then((theToken) => resolve(theToken))
        .catch((e) => reject(e));
    });

    /**
     * @function findAnnotations
     * @param {Object} searchQuery having fields: fileID : string, user:string
     * @returns {Promise} to resolve as an array of annotations
     */
    const findAnnotations = (searchQuery) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        const query = Object.assign({}, searchQuery, {
            backup : { $exists : false }
        });
        console.log("findAnnotations query", query);
        db.get('annotations').find(query)
            .then((annotations) => {
                if(annotations) {
                    resolve(annotations);
                } else {
                    resolve([]);
                }
            })
            .catch((e) => reject(e));
    });

    /**
     * @function updateAnnotation
     * @description Update annotation object
     * @param {Object} saveQuery having fields: fileID: string, user: string, project: string, Hash: string, annotation: JSON.stringify(Object{Regions: string[]})
     * @returns {Promise} to resolve when saving is complete
     */
    const updateAnnotation = (saveQuery) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        const { fileID, user, project, Hash, annotation } = saveQuery;
        db.get('annotations').update(
            Object.assign(
                {},
                { fileID, /*user, */project }, // update annotations authored by anyone
                { backup: { $exists: false } }
            ),
            { $set: { backup: true } },
            { multi: true }
        )
        .then(() => {
            const allAnnotation = JSON.parse(annotation);
            const arrayTobeSaved = allAnnotation.Regions.map((region) => ({
                fileID,
                user,
                project,
                Hash,
                annotation: region
            }));
            db.get('annotations').insert(arrayTobeSaved)
                .then(() => resolve())
                .catch( (e) => reject(e));
        });
    });

    /* add project */
    const addProject = (project) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('projects').insert(project)
            .then(() => resolve(project))
            .catch(reject);
    });

    /* delete project */
    const deleteProject = (projectQuery) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('projects').remove(projectQuery)
            .then(resolve)
            .catch(reject);
    });

    const updateProject = (project) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        delete project._id;
        db.get('projects').update(
            { shortname: project.shortname },
            { $set: project }
        )
            .then((o) => {
                resolve(o);
            })
            .catch(reject);
    });

    /* find project */
    const queryProject = (searchQuery) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('projects').findOne(searchQuery)
            .then((project) => {
                if(project) {
                    resolve(project);
                } else {
                    resolve();
                }
            })
            .catch(reject);
    });

    /* upsert project */
    const upsertProject = (project) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        queryProject({
            shortname : project.shortname
        })
            .then((o) => {
                if(typeof o === 'undefined') {
                    addProject(project)
                        .then(resolve)
                        .catch(reject);
                } else {
                    updateProject(project)
                        .then(resolve)
                        .catch(reject);
                }
            })
            .catch(reject);
    });

    /* query all projects */
    const queryAllProjects = (pagination) => new Promise((resolve, reject) => {
        if (!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('projects').find(pagination)
          .then((projects) => {
            if(projects) {
              resolve(projects);
            } else {
              reject({message: 'error find all projects', result: projects});
            }
          })
          .catch((e) => reject(e));
    });

    /* query user projects */
    const queryUserProjects = (requestedUser) => new Promise((resolve, reject) => {
      if (!checkHealth()) {
          return reject(new Error('db connection not healthy'));
      }
      db.get('projects').find({
        $or: [
          {owner: requestedUser},
          {"collaborators.list": {$elemMatch:{userID: requestedUser}}}
        ],
        backup: {$exists: false}
      })
        // @todo the results should be access filtered
        .then((projects) => {
          if(projects) {
              resolve(projects);
          } else {
            reject({message: 'error find all projects', result: projects});
          }
        })
        .catch(reject);
    });

    /* search users */
    const searchUsers = (query) => new Promise((resolve, reject) => {
        if(!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('users')
            .find({ "username": { "$regex": query.q } }, {fields:['username', 'name'], limit: 10})
            .then(resolve)
            .catch(reject);
    });

    /* search projects */
    const searchProjects = (query) => new Promise((resolve, reject) => {
        if(!checkHealth()) {
            return reject(new Error('db connection not healthy'));
        }
        db.get('projects')
            .find(
                {"shortname": { '$regex': query.q } },
                {fields: ["shortname", "name"], limit: 10 }
            )
            .then(resolve)
            .catch(reject);
    });

    db.then(() => {
      connected = true;

      console.log('connected successfully');

      if(typeof callback !== 'undefined') {
          return callback();
      }
    })
    .catch((e) => {
      // retry (?)
      connected = false;
      console.log('connection error', e);
    });

    return {
        addUser,
        queryUser,
        updateUser,
        upsertUser,
        queryAllUsers,
        findAnnotations,
        updateAnnotation,
        addProject,
        deleteProject,
        queryProject,
        updateProject,
        upsertProject,
        queryAllProjects,
        queryUserProjects,
        addToken,
        findToken,
        db,
        checkHealth,
        searchUsers,
        searchProjects
    };

    /* should discourage the use of db.db ... this renders it db specific ... */
};
