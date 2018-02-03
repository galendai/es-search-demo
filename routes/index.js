var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if (isImporting){
      res.render('index', { title: 'isImporting' });
  }
  res.render('index', { title: 'Express' });
});

module.exports = router;
