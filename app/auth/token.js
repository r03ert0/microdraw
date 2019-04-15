const TOKEN_DURATION = process.env.TOKEN_DURATION || 24 * (1000 * 3600);

// eslint-disable-next-line func-style
// eslint-disable-next-line max-statements
const token = function token(req, res) {
    const {db} = req.app;
    const {user} = req;

    /**
     * TODO
     * use next({ status: 500 })
     * etc to beautify error responses
     */
    if (!db) {
        return res.status(500).send('database notfound');
    }
    if (!user) {
        return res.status(401).send('not logged in');
    }

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
        expiryDate: new Date(now.getTime() + TOKEN_DURATION),
        // record the username
        username: user.username
    };

    // store it in the database for the user
    db.addToken(obj)
        .then((theToken) => res.json(theToken))
        .catch((e) => res.status(500).send(JSON.stringify(e)));

    /*
        // schedule its removal or log them forever?
        setTimer(function () {
            //req.db.get("log").remove(obj);
            req.db.removeToken(obj);
        }, req.tokenDuration);
    */
};

exports.authTokenMiddleware = function (req, res, next) {
    console.log('>> Check token');
    const theToken = req.params.token || req.query.token;
    if (!theToken) {
        console.log('>> No token');
        next();

        return;
    }
    const {db} = req.app;

    if (!db) {
        return next();
    }

    db && db.findToken(theToken)
    .then( (obj) => {
        if (obj) {
            // Check token expiry date
            const now = new Date();
            if (now.getTime() - obj.expiryDate.getTime() < 0) {
                console.log('>> Authenticated by token');
                req.isTokenAuthenticated = true;
                req.tokenUsername = obj.username;
                req.user = {
                    username: obj.username
                }
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

exports.getTokenEndPoint = token;
