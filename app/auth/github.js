/* eslint-disable no-sync */
const fs = require('fs');
const GithubStrategy = require('passport-github').Strategy;
const passport = require('passport');
const path = require('path');

module.exports = (app) => {
  try{
    const githubKeys = fs.readFileSync( path.join(__dirname, 'github-keys.json'), 'utf-8' );
    const githubKeysJson = JSON.parse(githubKeys);

    passport.use(new GithubStrategy( githubKeysJson,
      (accessToken, refreshToken, profile, done) => done(null, profile)));

    app.get('/auth/github', passport.authenticate('github'));
    app.get('/auth/github/callback',
      passport.authenticate('github', {failureRedirect: '/'}),
      function (req, res) {
        // successfully loged in. Check if user is new
        app.db.upsertUser({
          username: req.user.username, // github userID name (required)
          name :req.user.displayName, // github name (optional)
          // nickname : req.user.username,
          url: req.user._json.blog,
          brainboxURL: "/user/" + req.user.username,
          avatarURL: req.user._json.avatar_url,
          joined: (new Date()).toJSON()
        })
          .then(() => {
            res.redirect(req.session.returnTo || '/');
            delete req.session.returnTo;
          })
          .catch((e) => {
            console.log('db upsert user error', e);
            res.status(500).send(JSON.stringify(e));
          });
      });

    const loginMethods = app.get('loginMethods') ? app.get('loginMethods') : [];
    app.set('loginMethods',
      loginMethods.concat({
        url : '/auth/github',
        text : 'Log in with GitHub'
      }));

    return;
  } catch( e ) {
    console.log('./app/auth/github.js', 'github-key.json missing or parsing github-keys.json and setting route error', e);
  }
};
