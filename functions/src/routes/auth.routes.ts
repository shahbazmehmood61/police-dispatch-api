import * as functions from "firebase-functions";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as auth from "../controllers/auth.controller";
const cors = require("cors");

const main = express();

main.use(cors({ origin: true }));

// add routes here
main.use("/", auth);

main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

// exporting all auth endpoints
exports.auth = functions.https.onRequest(main);
