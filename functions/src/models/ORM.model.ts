import * as firebase from "firebase";

const firebaseclient = require("../../config/firebase-client.json");
firebase.initializeApp(firebaseclient);
const db = firebase.database();

export class ORMModel {
  constructor() { }

  set(url: string, setObject: Object) {
    return db.ref(url).set(setObject);
  }

  push(url: string, pushObject: Object) {
    return db.ref(url).push(pushObject);
  }

  once(url: string) {
    return new Promise((resolve, reject) => {
      return db.ref(url).once("value", (snap: any) => {
        console.log(snap.val());
        resolve(snap.val());
      },
        (error) => {
          console.log(error);
          reject("not got data");
        }
      );
    });
  }

  remove(url: string) {
    return db.ref(url).remove();
  }

  update(url: string, updateObject: Object) {
    return db.ref(url).update(updateObject);
  }

  readQueryData(url: string, orderByChild: string, equalTo: string) {
    return new Promise((resolve, reject) => {
      return db
        .ref(url)
        .orderByChild(orderByChild)
        .equalTo(equalTo)
        .once("value", (snap: any) => {
          resolve(snap.val());
        }, (error) => {
          reject(error);
        });
    });
  }
}
