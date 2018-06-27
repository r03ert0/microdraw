const GithubStrategy = require('passport-github').Strategy
const passport = require('passport')
const fs = require('fs')

module.exports = (app)=>{

  fs.readFile('github-keys.json','utf-8',(err,githubKeys)=>{
    if(err) throw err
    passport.use(new GithubStrategy( JSON.parse(githubKeys) ,
      (accessToken, refreshToken, profile, done) => done(null, profile)))
  })

  app.get('/auth/github', passport.authenticate('github'));
  app.get('/auth/github/callback',
      passport.authenticate('github', {failureRedirect: '/'}),
      function (req, res) {
          // successfully loged in. Check if user is new
          app.db.upsert({
              name :req.user.displayName,
              nickname : req.user.username,
              url: req.user._json.blog,
              brainboxURL: "/user/" + req.user.username,
              avatarURL: req.user._json.avatar_url,
              joined: (new Date()).toJSON()
          })
            .then(()=>{
                res.redirect(req.session.returnTo || '/');
                delete req.session.returnTo;
            })
            .catch(e=>{
                res.status(500).send(e)
            })
      });
}