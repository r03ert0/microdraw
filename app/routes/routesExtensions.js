const url = require('url');
const request = require('request');

module.exports = (app) => {
  app.get('/getTile', function (req, res) {
    const { source } = req.query;

    if( !source ) {
      return res.status(404).send('source must be defined');
    }

    request(req.query.source, {}).pipe(res);
  });

  // eslint-disable-next-line max-statements
  app.get('/getJson', function (req, res) {
    const { source } = req.query;

    if( !source ) {
      return res.status(404).send('source must be defined');
    }

    const thisHostname = req.protocol + '://' + req.get('host');
    const sourceHostname =
                (new RegExp('^http')).test(source) ?
                  url.parse(source).protocol + '//' + url.parse(source).host :
                  req.protocol + '://' + req.get('host');
    const sourcePath = url.parse(source).path ? url.parse(source).path : null;

    (new Promise((resolve, reject) => {
      if( sourceHostname && sourcePath ) {
        request(sourceHostname + sourcePath, (err, resp, body) => {
          if(err) {
            return reject(err);
          }
          if ((/error/).test(sourcePath)) {
            console.log({body, resp, err});
          }
          if(resp && resp.statusCode >= 400) {
            return reject(body);
          }

          return resolve(body);
        });
      } else {
        reject(new Error('ERROR: sourceurl not defined'));
      }
    }))
      .then((body) => {
        const json = JSON.parse(body);
        json.tileSources = json.tileSources.map((result) => {
          let tileSource = result;
          if(typeof result === 'string') {
            if((new RegExp('^http')).test(tileSource) === false) {
              if(tileSource[0] === '/') {
                tileSource = thisHostname + '/getTile?source=' + sourceHostname + tileSource;
              } else {
                tileSource = thisHostname + '/getTile?source=' + sourceHostname + '/' + tileSource;
              }
            }
          }

          console.log(tileSource);

          return tileSource;
        });
        res.status(200).send(JSON.stringify(json));
      })
      .catch((e) => {
        console.log("13");
        console.log('Error at /getJson', e);
        res.status(404).send(e);
      });
  });
};
