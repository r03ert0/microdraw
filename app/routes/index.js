var express = require('express');
var router = express.Router(); // eslint-disable-line new-cap

/* GET home page. */
router.get('/', function(req, res, next) { // eslint-disable-line no-unused-vars
  res.render('index', { 
    title: 'Express',
    user : req.user
  });
});

module.exports = router;
