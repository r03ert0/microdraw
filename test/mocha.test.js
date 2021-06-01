/**
 * files included here will be tested by npm run mocha
 */

require('../app/routes/routeExtensions.spec');
require('../app/controller/api/api.spec');

/**
 * testing auth
 */
require('../app/auth/token.spec');
// require('../app/auth/local.spec');
require('../app/auth/auth.spec');

/**
 * testing db
 */
require('../app/db/db.spec');
