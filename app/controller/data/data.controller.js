"use strict";

function data(req, res) {
    var { source: source } = req.query; // eslint-disable-line no-unused-vars, no-useless-rename
    var login = (req.isAuthenticated()) ?
                ("<a href='/user/" + req.user.username + "'>" + req.user.username + "</a> (<a href='/logout'>Log Out</a>)")
                : req.warningGithubConfig ? ("Github OAuth failed ... ")
                    :("<a href='/auth/github'>Log in with GitHub</a>");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous"; // eslint-disable-line no-unused-vars

    // store return path in case of login
    req.session.returnTo = req.originalUrl;

    res.render('data', {
        title: 'MicroDraw::Data',
        params: JSON.stringify(req.query),
        login: login
    });
}

function DataController() {
    this.data = data;
}

module.exports = new DataController();
