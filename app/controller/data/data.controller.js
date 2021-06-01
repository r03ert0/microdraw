"use strict";

const data = function (req, res) {
    // store return path in case of login
    req.session.returnTo = req.originalUrl;

    res.render('data', {
        title: 'MicroDraw::Data',
        loginMethods : req.appConfig.loginMethods || [],
        params: JSON.stringify(req.query),
        username : req.user
    });
};

function DataController() {
    this.data = data;
}

module.exports = new DataController();
