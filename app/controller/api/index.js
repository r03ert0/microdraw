const express = require('express');
const router = express.Router();
const multer = require('multer');

const fs = require('fs');

const TMP_DIR = process.env.TMP_DIR
const storage = TMP_DIR
    ? multer.diskStorage({
        destination: TMP_DIR
    })
    : multer.memoryStorage()

// API routes

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
                    && result.collaborators.list.map((u)=>u.username) || [];
        console.log(`project owner: ${owner}, users: ${users}`);

        // check if user is among the allowed project's users
        userIndex = [...users, owner].indexOf(username);
        if(userIndex<0) {
            res.status(403).send(`User ${username} not part of project ${project}`);

            return;
        }
    }

    // include backups
    const backup = (typeof req.query.backup === "undefined")?false:true;

    const query = {
        fileID: buildFileID(req.query),
        // user: { $in: [...users, username] },
        project: project,
    };
    console.log("api get query", query);

    let annotations;
    try {
      annotations = await req.app.db.findAnnotations(query, backup);
    } catch(err) {
      throw new Error(err);
    }

    res.status(200).send(annotations);
});

function buildFileID({source, slice}) {
    return `${source}&slice=${slice}`;
}

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
    let prevAnnotations;
    try {
      prevAnnotations = await req.app.db.findAnnotations({fileID, user, project});
    } catch(err) {
      throw new Error(err);
    }

    // update previous annotations with new annotations,
    // overwrite what already exists, remove those marked for removal
    for(const prevAnnot of prevAnnotations.Regions) {
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
    try {
      await req.app.db.updateAnnotations(
        Object.assign(
          {},
          { fileID, /*user,*/ project }, // update annotations authored by anyone
          { backup: { $exists: false } }
        ),
        { $set: { backup: true } },
        { multi: true }
      );
    } catch (err) {
      throw new Error(err);
    }

    // add new version
    const arrayTobeSaved = annotation.Regions.map((region) => ({
      fileID,
      user, // "user" property in annotation corresponds to "username" everywhere else
      project,
      Hash,
      annotation: region
    }));
    try {
      await req.app.db.insertAnnotations(arrayTobeSaved);
    } catch(err) {
      throw new Error(err);
    }
}

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
      userIndex = [...users, owner].indexOf(username);
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
      res.status(200).send({success: true})
    })
    .catch((e) => {
      res.status(500).send({err:JSON.stringify(e)})
    });
};

/**
 * Tests if an object is a valid annotation.
 * @param {object} obj An annotation object to validate.
 * @returns {boolean} True if the object is valid
 */
const jsonIsValid = function (obj) {
    if(typeof obj === 'undefined') {
        return false;
    } else if(obj.constructor !== Array) {
        return false;
    } else if(!obj.every(item => item.annotation && item.annotation.path)) {
        return false;
    }

    return true;
};

/**
 * Loads a json file containing an annotation object.
 * @param {string} annotationPath Path to json file containing an annotation
 * @returns {object} A valid annotation object or nothing.
 */
const loadAnnotationFile = function (annotationPath) {
    const json = JSON.parse(fs.readFileSync(annotationPath).toString());
    if(jsonIsValid(json) === true) {
        return json;
    }
};

const saveFromAPI = async function (req, res) {
    const fileID = buildFileID(req.query);
    const username = req.user && req.user.username;
    const { project, Hash } = req.query;
    const rawString = TMP_DIR
        ? fs.readFileSync(req.files[0].path).toString()
        : req.files[0].buffer.toString();
    const json = JSON.parse(rawString);
    if (typeof project === 'undefined') {
        res.status(401).json({msg: "Invalid project"});
    } else if(!jsonIsValid(json)) {
        res.status(401).json({msg: "Invalid annotation file"});
    } else {
        const { action } = req.query;
        const annotations = action === 'append'
            ? await req.app.db.findAnnotations({ fileID, user: username, project })
            : { Regions: [] };

        /**
         * use object destruction to avoid mutation of annotations object
         */
        const { Regions, ...rest } = annotations
        updateAnnotation(req, {
            fileID,
            user: username,
            project,
            Hash,
            annotationString: JSON.stringify({
                ...rest,
                Regions: Regions.concat(json.map(v => v.annotation))
            })
        })
            .then(() => res.status(200).send({msg: "Annotation successfully saved"}))
            .catch((e) => res.status(500).send({err:JSON.stringify(e)}));
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
    } else {
        return next()
    }
}

router.post('/upload', filterAuthorizedUserOnly, multer({ storage }).array('data'), function (req, res) {
    console.warn("call to POST from API");

    const { action } = req.query
    switch(action) {
        case 'save': 
        case 'append':
            saveFromAPI(req, res)
        break;
        default:
            return res.status(500).send({err: `actions other than save and append are no longer supported`})
    }
});

router.use('', (req, res) => {
    return res.redirect('/')
})

module.exports = router;