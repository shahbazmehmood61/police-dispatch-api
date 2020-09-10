import * as functions from 'firebase-functions';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as messaging from '../controllers/chat.controller';
const cors = require('cors');

const main = express();
main.use(cors({ origin: true }));

// add routes here
main.use('/', messaging);

main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

// exporting all auth endpoints
exports.messaging = functions.https.onRequest(main);