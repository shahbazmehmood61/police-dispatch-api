const firebase = require('firebase');
const admin = require('firebase-admin');
import { ORMModel } from './ORM.model';
import { ORMAuth } from './ORMAuth.model';
import { Validation } from '../utils/validation';
const validate = new Validation();

const auth = firebase.auth();
const ormModel = new ORMModel();
const ormAuth = new ORMAuth();

export class AuthModel {

    constructor() { }

    signin(body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            auth.signInWithEmailAndPassword(body.email, body.password)
                .then(() => {
                    if (body.platform === 'mobile') {
                        ormModel.once('/usersMobile/' + auth.currentUser.uid)
                            .then((userInfo) => {
                                resolve({ user: auth.currentUser, userInfo: userInfo });
                            }).catch((error: any) => { reject({ code: error.message }); });
                    } else if (body.platform === 'web') {
                        ormModel.once('/usersOfficers/' + auth.currentUser.uid)
                            .then((userInfo) => {
                                resolve({ user: auth.currentUser, userInfo: userInfo });
                            }).catch((error: any) => { reject({ code: error.message }); });
                    }
                })
                .catch((error: any) => { reject({ code: error.message }); });
        })
    }

    logout(): Promise<any> {
        return auth.signOut();
    }

    signup(body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            auth.createUserWithEmailAndPassword(body.email, body.password)
                .then((userRecord: any) => {
                    delete body.password;
                    auth.currentUser.updateProfile({
                        displayName: validate.checkString(body.firstName) + ' ' + validate.checkString(body.lastName),
                        phoneNumber: body.telephone
                    }).then(() => {
                        ormModel.set('usersMobile/' + userRecord.user.uid, body)
                            .then(() => {
                                auth.signOut().then(() => { resolve({ uid: userRecord.user.uid }); })
                                    .catch((error: any) => { reject({ code: error.message }); });
                            }).catch((error: any) => { reject({ code: error.message }); });
                    }).catch((error: any) => { reject({ code: error.message }); });
                }).catch((error: any) => { reject({ code: error.message }); });
        });
    }

    checkUserLogin(uid: string, authToken: any): Promise<any> {
        return new Promise((resolve, reject) => {

            ormAuth.getUser(uid)
                .then(() => {
                    admin.auth().verifyIdToken(authToken)
                        .then((decodedToken: any) => { resolve({ decodedToken: decodedToken }); })
                        .catch((error: any) => { reject({ code: error.message }); });
                }).catch((error: any) => { reject({ code: error.message }); });
        });
    }

    postSocialAccountsData(body: any, postObject: Object): Promise<any> {
        const url = 'usersMobile/' + body.uid;

        return new Promise((resolve, reject) => {
            ormModel.once(url)
                .then((snap: any) => {
                    if (snap) {
                        resolve({ msg: 'Already have profile' });
                    } else {
                        ormModel.set(url, postObject)
                            .then(() => {
                                resolve({ msg: 'Data stored' });
                            }).catch((error: any) => { reject({ code: error.message }); });
                    }
                }).catch((error: any) => { reject({ code: error.message }); });
        });
    }

    forgetpassword(body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            auth.sendPasswordResetEmail(body.email)
                .then(() => { resolve({ msg: 'Email send' }) })
                .catch((error: any) => { reject({ code: error.message }); });
        });
    }

    registerOfficer(body: any, register: Object): Promise<any> {
        return new Promise((resolve, reject) => {
            auth.createUserWithEmailAndPassword(body.email, body.password)
                .then((userRecord: any) => {
                    ormModel.set('/usersOfficers/' + userRecord.user.uid, register)
                        .then(() => {
                            auth.signOut();
                            resolve({ uid: userRecord.user.uid });
                        }).catch((error: any) => { reject({ code: error.message }); });
                }).catch((error: any) => { reject({ code: error.message }); });
        })
    }

}