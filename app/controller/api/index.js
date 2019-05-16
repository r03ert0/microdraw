const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// API routes
router.get('', function (req, res) {

    console.warn("call to GET api");

    const user = (req.user && req.user.username) || 'anonymous';

    console.warn(req.query);
    const { source, slice } = req.query;

    req.app.db.findAnnotations({
        fileID : `${source}&slice=${slice}`,
        user : user
    })
        .then(annotations=>res.status(200).send(annotations))
        .catch(e=>res.status(500).send({err:JSON.stringify(e)}))
});

const saveFromGUI = function (req, res) {
    const { source, slice, Hash, annotation } = req.body;

    const user = (req.user && req.user.username) || 'anonymous';

    req.app.db.updateAnnotation({
        fileID : `${source}&slice=${slice}`,
        user,
        Hash,
        annotation
    })
        .then(() => res.status(200).send())
        .catch((e) => res.status(500).send({err:JSON.stringify(e)}));
};

const saveFromAPI = function (req, res) {
    const user = req.user && req.user.username;

    if (typeof user === 'undefined') {
        res.status(401).send({msg:'API upload requires a valid token authentication'});
    } else {
        const { source, slice, Hash } = req.query;
        const fileID = `${source}&slice=${slice}`;
        const json = JSON.parse(fs.readFileSync(req.files[0].path).toString());
        const annotations = {Regions: []};
        for(let ann of json) {
            annotations.Regions.push(ann.annotation);
        }

        req.app.db.updateAnnotation({
            fileID : fileID,
            user,
            Hash,
            annotation: JSON.stringify(annotations)
        })
            .then(() => res.status(200).send())
            .catch((e) => res.status(500).send({err:JSON.stringify(e)}));
    }
};

router.post('', function (req, res) {
    console.warn("call to POST from GUI");

    if(req.body.action === 'save') {
        saveFromGUI(req, res);
    } else {
        res.status(500).send({err:'actions other than save are no longer supported.'});
    }
});

router.post('/upload', multer({dest: path.join(__dirname, 'tmp')}).array('data'), function (req, res) {
    console.warn("call to POST from API");

    if(req.query.action === 'save') {
        saveFromAPI(req, res);
    } else {
        res.status(500).send({err:'actions other than save are no longer supported.'});
    }
});

module.exports = router;