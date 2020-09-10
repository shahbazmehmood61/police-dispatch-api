const admin = require('firebase-admin');

const adminclient = require('../../config/admin-client.json');

admin.initializeApp({
    credential: admin.credential.cert(adminclient),
    databaseURL: "https://police-dispatch-2ede5.firebaseio.com"
});

const auth = admin.auth();

export class ORMAuth {
    // constructor() { }

    getUser(uid: string) {
        return auth.getUser(uid);
    }
    getUserByEmail(email: string) {
        return auth.getUserByEmail(email);
    }
}