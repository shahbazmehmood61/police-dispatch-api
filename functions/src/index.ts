const authRestEndpoint = require('./routes/auth.routes');
const dashboardRestEndpoint = require('./routes/dashboard.routes');
const messageRestEndpoint = require('./routes/chat.routes');
const trigers = require('./trigers/trigers.function');

module.exports = {
    ...trigers,
    ...authRestEndpoint,
    ...dashboardRestEndpoint,
    ...messageRestEndpoint,
};