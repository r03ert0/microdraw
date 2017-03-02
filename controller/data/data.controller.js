"use strict";


var data = function data(req, res) {
    var source = req.query.source;
    res.render('data', {
        title: 'MicroDraw::Data',
        params: JSON.stringify(req.query)
    });
};

var dataController = function () {
    this.data = data;
};

module.exports = new dataController();
