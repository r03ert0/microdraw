'use strict';
const request = require('request');

request({
    url:'http://localhost:3000/api',
    method: 'POST',
    form: {action: 'host'}
});
