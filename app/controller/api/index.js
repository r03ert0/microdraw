const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const fs = require('fs');

const TMP_DIR = process.env.TMP_DIR
const storage = TMP_DIR
    ? multer.diskStorage({
        destination: TMP_DIR
    })
    : multer.memoryStorage()

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
        .catch(e=>res.state(500).send({err:JSON.stringify(e)}))
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

    const { source, slice, Hash } = req.query;
    const fileID = `${source}&slice=${slice}`;
    const rawString = TMP_DIR
        ? fs.readFileSync(req.files[0].path).toString()
        : req.files[0].buffer.toString()
    const json = JSON.parse(rawString);
    const annotations = {Regions: []};
    for(let ann of json) {
        annotations.Regions.push(ann.annotation);
    }

    req.app.db.updateAnnotation({
        fileID : fileID,
        user,
        annotation: JSON.stringify(annotations)
    })
        .then(() => res.status(200).send())
        .catch((e) => res.status(500).send({err:JSON.stringify(e)}));
};

router.post('', function (req, res) {
    console.warn("call to POST from GUI");

    if(req.body.action === 'save') {
        saveFromGUI(req, res);
    } else {
        res.status(500).send({err:'actions other than save are no longer supported.'});
    }
});

const filterAuthorizedUserOnly = (req, res, next) => {
    const user = req.user && req.user.username;
    if (typeof user === 'undefined') {
        return res.status(401).send({msg:'API upload requires a valid token authentication'});
    } else {
        return next()
    }
}

router.post('/upload', filterAuthorizedUserOnly,  multer({ storage }).array('data'), function (req, res) {
    console.warn("call to POST from API");

    saveFromAPI(req, res);
});

module.exports = router;