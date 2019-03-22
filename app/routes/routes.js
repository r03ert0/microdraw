
const mustacheExpress = require('mustache-express');
const path = require('path')

module.exports = (app)=>{
    console.log(`configuring routes`)

    // view engine setup
    app.engine('mustache', mustacheExpress());
    app.set('views', path.join(__dirname,'../views'));
    app.set('view engine', 'mustache');

    // set pass app config to req
    const configSetup = (req,res,next)=>{
        req.appConfig = {
            loginMethods : app.get('loginMethods') || [],
            db : app.db
        }
        next()
    }

    app.get('/', configSetup, function (req, res) { // /auth/github

      // store return path in case of login
      req.session.returnTo = req.originalUrl;
      res.render('index', {
          title: 'MicroDraw',
          loginMethods : app.get('loginMethods') || [],
          user: req.user ? req.user : null
      });
    });

    app.use('/data', configSetup, (req, res, next) => {
      next();
    } , configSetup, require('../controller/data/'));

    app.use('/user' , configSetup, require('../controller/user/'));

    // API routes
    app.get('/api', configSetup, function (req, res) {

      console.warn("call to GET api");
      console.warn(req.query);

      app.db.findAnnotations({
          fileID : req.query.fileID,
          user : req.user ? req.user.username : 'anonymouse'
      })
          .then(annotations=>res.status(200).send(annotations))
          .catch(e=>res.state(500).send({err:JSON.stringify(e)}))
    });

    app.post('/api', configSetup, function (req, res) {

      console.warn("call to POST api");

      if(req.body.action === 'save'){
        app.db.updateAnnotation({
            fileID : req.body.fileID,
            user : req.user ? req.user.username : 'anonymouse',
            Hash : req.body.Hash,
            annotation :req.body.annotation})
              .then(()=>res.status(200).send())
              .catch(e=>res.status(500).send({err:JSON.stringify(e)}))
      }else{
          res.status(500).send({err:'actions other than save are no longer supported.'})
      }
    });

    /* patches for bypassing CORS header restrictions */
    require('./routesExtensions')(app)
}