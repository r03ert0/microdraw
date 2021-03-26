const request = require('request');

const getHttpImg = function (req, res) {
  const url = req.query.url;
  request.get(url, {encoding: 'binary'}, (err, resp, body) => {
    res.writeHead(200, {'Content-Type': 'image/jpg' });
    res.end(body, 'binary');
  });
};

exports.getHttpImg = getHttpImg;
