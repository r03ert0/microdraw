
const mustacheExpress = require('mustache-express');
const path = require('path');
const {authTokenMiddleware, getTokenEndPoint} = require('../auth/token');

module.exports = (app) => {
    console.log(`configuring routes`);

    // view engine setup
    app.engine('mustache', mustacheExpress());
    app.set('views', path.join(__dirname, '../views'));
    app.set('view engine', 'mustache');

    // set pass app config to req
    const configSetup = (req, res, next) => {
        req.appConfig = {
            loginMethods : app.get('loginMethods') || [],
            db : app.db
        };
        next();
    };

    app.use(configSetup);

    app.get('/', function (req, res) { // /auth/github

      // store return path in case of login
      req.session.returnTo = req.originalUrl;
      res.render('index', {
          title: 'MicroDraw',
          loginMethods : app.get('loginMethods') || [],
          user: req.user ? req.user : null
      });
    });

    app.use('/data', (req, res, next) => {
      next();
    }, require('../controller/data/'));

    app.use('/user', require('../controller/user/'));

    app.use('/project', require('../controller/project/'));

    app.use('/search', require('../controller/search/'));

    app.get('/token', getTokenEndPoint);

    app.get('/microdraw', (req, res, next) => {
      res.render('partials/microdraw');
    });

    app.use('/api', authTokenMiddleware, require('../controller/api/'));

    /* patches for bypassing CORS header restrictions */
    require('./routesExtensions')(app);
};
