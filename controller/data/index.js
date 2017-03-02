var express = require('express');
var controller = require('./data.controller');

var router = express.Router();

router.get('', controller.data);

module.exports = router;