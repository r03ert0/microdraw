const request = require('request');

const getHttpImg = function (req, res) {
  const {url} = req.query;
  request.get(url, {encoding: 'binary'}, (err, resp, body) => {
    if(err) {
      console.error(err);
    }
    res.writeHead(200, {'Content-Type': 'image/jpg' });
    res.end(body, 'binary');
  });
};

exports.getHttpImg = getHttpImg;
