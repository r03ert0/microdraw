"use strict";

var data = function data(req, res) {
    var source = req.query.source;
    var login = (req.isAuthenticated()) ?
                ("<a href='/user/" + req.user.username + "'>" + req.user.username + "</a> (<a href='/logout'>Log Out</a>)")
                : ("<a href='/auth/github'>Log in with GitHub</a>");
    var loggedUser = req.isAuthenticated()?req.user.username:"anonymous";

    // store return path in case of login
    req.session.returnTo = req.originalUrl;

    res.render('data', {
        title: 'MicroDraw::Data',
        params: JSON.stringify(req.query),
        login: login
    });
};

var dataController = function () {
    this.data = data;
};

module.exports = new dataController();
