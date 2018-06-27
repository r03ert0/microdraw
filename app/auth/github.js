const GithubStrategy = require('passport-github').Strategy

module.exports = (app)=>{

  app.get('/auth/github', passport.authenticate('github'));
  app.get('/auth/github/callback',
      passport.authenticate('github', {failureRedirect: '/'}),
      function (req, res) {
          // successfully loged in. Check if user is new
          db.get('user').findOne({nickname: req.user.username}, "-_id")
              .then(function (json) {
                  if (!json) {
                      // insert new user
                      json = {
                          name: req.user.displayName,
                          nickname: req.user.username,
                          url: req.user._json.blog,
                          brainboxURL: "/user/" + req.user.username,
                          avatarURL: req.user._json.avatar_url,
                          joined: (new Date()).toJSON()
                      };
                      db.get('user').insert(json);
                  } else {
                      console.warn("Update user data from GitHub");
                      db.get('user').update({nickname: req.user.username}, {$set:{
                          name: req.user.displayName,
                          url: req.user._json.blog,
                          avatarURL: req.user._json.avatar_url
                      }});
                  }
              });
              res.redirect(req.session.returnTo || '/');
              delete req.session.returnTo;
      });
}