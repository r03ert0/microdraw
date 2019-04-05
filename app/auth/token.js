// eslint-disable-next-line func-style
const token = function token(req, res) {
    if (req.isAuthenticated()) {
        const a = Math.random()
                    .toString(36)
                    .slice(2);
        const b = Math.random()
                    .toString(36)
                    .slice(2);
        const now = new Date();

        // generate a random token
        const obj = {
            token: a + b,
            // expiration date: now plus tokenDuration milliseconds
            expiryDate: new Date(now.getTime() + req.tokenDuration),
            // record the username
            username: req.user.username
        };

        // store it in the database for the user
        req.db.addToken(obj);

        /*
            // schedule its removal or log them forever?
            setTimer(function () {
                //req.db.get("log").remove(obj);
                req.db.removeToken(obj);
            }, req.tokenDuration);
        */

        res.json(obj);
    } else {
        res.redirect('/');
    }
};

module.exports = (app) => {
    console.log(`loading token module`);

    global.tokenAuthentication = function (req, res, next) {
        console.log('>> Check token');
        const token = req.params.token || req.query.token;
        if (!token) {
            console.log('>> No token');
            next();
    
            return;
        }
        req.db.findToken(token)
        .then( (obj) => {
            if (obj) {
                // Check token expiry date
                const now = new Date();
                if (now.getTime() - obj.expiryDate.getTime() < 0) {
                    console.log('>> Authenticated by token');
                    req.isTokenAuthenticated = true;
                    req.tokenUsername = obj.username;
                } else {
                    console.log('>> Token expired');
                    req.isTokenAuthenticated = false;
                    req.tokenUsername = obj.username;
                }
            }
            next();
        })
        .catch( (err) => {
            console.log('ERROR:', err);
            next();
        });
    };

    app.use((req, res, next) => {
        req.db = app.db;
        req.tokenDuration = 24 * (1000 * 3600); // token duration: 24h in milliseconds
        next();
    });

    app.get('/token', token);
};