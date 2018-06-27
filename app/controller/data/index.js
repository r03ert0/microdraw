var express = require('express');
var controller = require('./data.controller');

var router = express.Router(); // eslint-disable-line new-cap

router.get('', controller.data);

module.exports = router;
