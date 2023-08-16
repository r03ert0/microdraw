/* eslint-disable max-lines */
const express = require('express');
const router = new express.Router();
const multer = require('multer');

const fs = require('fs');

const {TMP_DIR} = process.env;
const storage = TMP_DIR
  ? multer.diskStorage({
    destination: TMP_DIR
  })
  : multer.memoryStorage();

const buildFileID = function ({ source, slice }) {
  return `${source}&slice=${slice}`;
};

// API routes

// eslint-disable-next-line max-statements
router.get('/', async function (req, res) {
  console.warn("call to GET api");
  console.warn(req.query);

  // current user
  const username = (req.user && req.user.username) || 'anyone';
  console.log(`current user: ${username}`);

  // project name
  const project = (req.query.project) || '';
  console.log(`current project: ${project}`);

  if(project) {
    // project owner and project users
    const result = await req.app.db.queryProject({shortname: project});
    const owner = result
                    && result.owner;
    const users = result
                    && result.collaborators
                    && result.collaborators.list
                    && result.collaborators.list.map((u) => u.username) || [];
    console.log(`project owner: ${owner}, users: ${users}`);

    // check if user is among the allowed project's users
    const userIndex = [...users, owner].indexOf(username);
    if(userIndex<0) {
      res.status(403).send(`User ${username} not part of project ${project}`);

      return;
    }
  }

  // include backups
  const backup = typeof req.query.backup !== "undefined";

  const query = {
    fileID: buildFileID(req.query),
    // user: { $in: [...users, username] },
    project: project
  };
  console.log("api get query", query);

  const annotations = await req.app.db.findAnnotations(query, backup);
  console.log(`found ${annotations.length} annotations`);

  res.status(200).send(annotations);
});

// eslint-disable-next-line max-statements
const updateAnnotation = async (req, {
  fileID,
  user,
  project,
  Hash,
  annotationString
}) => {
  // get new annotations and ID
  const annotation = JSON.parse(annotationString);
  const {Regions: newAnnotations, RegionsToRemove: uidsToRemove} = annotation;

  // get previous annotations
  const prevAnnotations = await req.app.db.findAnnotations({fileID, user, project});

  // update previous annotations with new annotations,
  // overwrite what already exists, remove those marked for removal
  for(const prevAnnot of prevAnnotations) {
    const {uid} = prevAnnot.annotation;
    let foundInPrevious = false;
    for(const newAnnot of newAnnotations) {
      if(newAnnot.uid === uid) {
        foundInPrevious = true;
        break;
      }
    }

    let markedForRemoval = false;
    if(uidsToRemove) {
      for(const uidToRemove of uidsToRemove) {
        if(uid === uidToRemove) {
          markedForRemoval = true;
          break;
        }
      }
    }

    if(!foundInPrevious && !markedForRemoval) {
      newAnnotations.push(prevAnnot.annotation);
    }
  }
  annotation.Regions = newAnnotations;

  // mark previous version as backup
  const query = Object.assign(
    {},
    { fileID, /*user,*/ project }, // update annotations authored by anyone
    { backup: { $exists: false } }
  );
  const update = { $set: { backup: true } };
  const options = { multi: true };

  // add new version
  const arrayTobeSaved = annotation.Regions.map((region) => ({
    fileID,
    user, // "user" property in annotation corresponds to "username" everywhere else
    project,
    Hash,
    annotation: region
  }));
  await req.app.db.updateAnnotations({ query, update, options });
  await req.app.db.insertAnnotations(arrayTobeSaved);
};

// eslint-disable-next-line max-statements
const saveFromGUI = async function (req, res) {
  const { Hash, annotation } = req.body;

  // current user
  const username = (req.user && req.user.username) || 'anyone';
  console.log(`current user: ${username}`);

  // project name
  const project = (req.body.project) || '';
  console.log(`current project: ${project}`);

  // project owner and project users
  if(project) {
    const result = await req.app.db.queryProject({shortname: project});
    const owner = result
        && result.owner;
    const users = result
        && result.collaborators
        && result.collaborators.list
        && result.collaborators.list.map((u) => u.username);
    console.log(`project owner: ${owner}, users: ${users}`);

    // check if user is among the allowed project's users
    const userIndex = [...users, owner].indexOf(username);
    if(userIndex<0) {
      res.status(403).send(`User ${username} not part of project ${project}`);

      return;
    }
  }

  const fileID = buildFileID(req.body);
  updateAnnotation(req, {
    fileID,
    user: username,
    project,
    Hash,
    annotationString: annotation
  })
    .then(() => {
      res.status(200).send({success: true});
    })
    .catch((e) => {
      res.status(500).send({err:e.message});
    });
};

/**
 * Tests if an object is a valid annotation.
 * @param {object} obj An annotation object to validate.
 * @returns {boolean} True if the object is valid
 */
// eslint-disable-next-line max-statements
const jsonIsValid = function (obj) {
  if(typeof obj === 'undefined') {
    return {valid:false, msg: "json object undefined"};
  }

  if(obj.constructor !== Array) {
    return {valid: false, msg: "json object is not an array"};
  }

  if(!obj.every((item) => item.annotation)) {
    return {valid: false, msg: "items do not have an `annotation` property"};
  }
  if(!obj.every((item) => item.annotation.path)) {
    return {valid: false, msg: "items do not have a `path` property"};
  }
  if(!obj.every((item) => item.annotation.name)) {
    return {valid: false, msg: "items do not have a `name` property"};
  }
  if(!obj.every((item) => item.annotation.uid)) {
    return {valid: false, msg: "items do not have a `uid` property"};
  }

  return {valid: true};
};

/**
 * Loads a json file containing an annotation object.
 * Not used anymore
 * @param {string} annotationPath Path to json file containing an annotation
 * @returns {object} A valid annotation object or nothing.
 */
// const loadAnnotationFile = function (annotationPath) {
//   const json = JSON.parse(fs.readFileSync(annotationPath).toString());
//   if(jsonIsValid(json) === true) {
//     return json;
//   }
// };

// eslint-disable-next-line max-statements
const saveFromAPI = async function (req, res) {
  const fileID = buildFileID(req.query);
  const username = req.user && req.user.username;
  const { project, Hash } = req.query;
  const rawString = TMP_DIR
    ? await fs.promises.readFile(req.files[0].path).toString()
    : req.files[0].buffer.toString();

  const json = JSON.parse(rawString);

  // add uid to path
  json.forEach((v) => {
    v.annotation.uid = Math.random().toString(16)
      .slice(2);
  });

  // validate and submit
  if (typeof project === 'undefined') {
    res.status(401).json({msg: "Invalid project"});
  } else if(!jsonIsValid(json).valid) {
    res.status(401).json({
      msg: `Invalid annotation file: ${jsonIsValid(json).msg}`
    });
  } else {
    const { action } = req.query;

    let annotations = { Regions: [] };
    if (action === 'append') {
      const oldAnnotations = await req.app.db.findAnnotations({ fileID, user: username, project });
      annotations = {
        Regions: oldAnnotations
      };
    }

    /**
    * use object destruction to avoid mutation of annotations object
    */

    const { Regions, ...rest } = annotations;

    updateAnnotation(req, {
      fileID,
      user: username,
      project,
      Hash,
      annotationString: JSON.stringify({
        ...rest,
        Regions: Regions.concat(json.map((v) => v.annotation))
      })
    })
      .then(() => res.status(200).send({msg: "Annotation successfully saved"}))
      .catch((e) => res.status(500).send({ err: e.message}));
  }
};

router.post('/', function (req, res) {
  console.warn("call to POST from GUI");

  if(req.body.action === 'save') {
    saveFromGUI(req, res);
  } else {
    res.status(500).send({err:'actions other than save are no longer supported.'});
  }
});

const filterAuthorizedUserOnly = (req, res, next) => {
  const username = req.user && req.user.username;
  if (typeof username === 'undefined') {
    return res.status(401).send({msg:'Invalid user'});
  }

  return next();

};

router.post('/upload', filterAuthorizedUserOnly, multer({ storage }).array('data'), function (req, res) {
  console.warn("call to POST from API");

  const { action } = req.query;
  switch(action) {
  case 'save':
  case 'append':
    saveFromAPI(req, res);
    break;
  default:
    return res.status(500).send({err: `actions other than save and append are no longer supported`});
  }
});

router.use('', (req, res) => res.redirect('/'));

module.exports = router;
