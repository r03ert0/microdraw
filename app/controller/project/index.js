const express = require('express');
const controller = require('./project.controller');

const router = new express.Router();

router.get('/new', controller.validator, controller.projectNew);

router.get('/json', controller.apiProjectAll);
router.get('/json/:projectName', controller.validator, controller.apiProject);

router.get('/:projectName', controller.validator, controller.project);
router.get('/:projectName/settings', controller.validator, controller.settings);

router.post('/json/:projectName', controller.validator, controller.postProject);

module.exports = router;
