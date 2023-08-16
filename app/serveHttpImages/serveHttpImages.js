const http = require('http');

const getHttpImg = function (req, res) {
  const { url } = req.query;

  http.get(url, (response) => {
    let data = Buffer.alloc(0);

    response.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    response.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data, 'binary');
    });
  }).on('error', (err) => {
    console.error(err);
    res.sendStatus(500);
  });
};

exports.getHttpImg = getHttpImg;

/*
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
*/
