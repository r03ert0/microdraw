
const mustacheExpress = require('mustache-express');
const path = require('path')

module.exports = (app)=>{
    console.log(`configuring routes`)

    /* middleware to attach objects required by routes */
    const decorateMiddleware = (req,res,next)=>{
        /* attach db interface */
        req.db = app.db

        next()
    }

    // view engine setup
    app.engine('mustache', mustacheExpress());
    app.set('views', path.join(__dirname,'views'));
    app.set('view engine', 'mustache');

    app.get('/', function (req, res) { // /auth/github

      // store return path in case of login
      req.session.returnTo = req.originalUrl;
      res.render('index', {
          title: 'MicroDraw',
          user: req.user ? req.user : null
      });
    });

    app.use('/data', (req, res, next) => {
      next();
    }, decorateMiddleware, require('../controller/data/'));

    app.use('/user', decorateMiddleware, require('../controller/user/'));

    // API routes
    app.get('/api', function (req, res) {

      console.warn("call to GET api");
      console.warn(req.query);

      app.db.findAnnotations({
          fileID : req.query.fileID,
          user : req.user ? req.user.username : 'anonymouse'
      })
          .then(annotations=>res.status(200).send(annotations))
          .catch(e=>res.state(500).send({err:JSON.stringify(e)}))
    });

    app.post('/api', function (req, res) {

      console.warn("call to POST api");

      if(req.body.action === 'save'){
        app.db.updateAnnotation({
            fileID : req.body.fileID,
            user : req.user ? req.user.username : 'anonymouse',
            annotationHash : req.body.annotationHash,
            annotation :req.body.annotation})
              .then(()=>res.status(200))
              .catch(e=>res.status(500).send({err:JSON.stringify(e)}))
      }else{
          res.status(500).send({err:'actions other than save are no longer supported.'})
      }
    });

    /* patches for bypassing CORS header restrictions */
    require('./routesExtensions')(app)
}