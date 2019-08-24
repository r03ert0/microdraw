const express = require('express');
const controller = require('./search.controller');

const router = new express.Router();

router.get('/json/users', controller.api_searchUsers);
router.get('/json/projects', controller.api_searchProjects);

module.exports = router;
