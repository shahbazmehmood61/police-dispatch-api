const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');

const db = firebase.database();
const messaging = admin.messaging();
const auth = admin.auth();

const groupChat = functions.database.ref('/groupMessage/{GID}/{chatID}')
  .onCreate((snap: any, context: any) => {
    const message = snap.val();

    const CID = context.params.chatID;
    const GID = context.params.GID;
    return db.ref('/groupDetail/' + GID + '/members')
      .once('value', (snapShot: any) => {
        auth.getUser(message.senderID)
          .then((userRecord: any) => {
            for (const memberID of snapShot.val()) {
              db.ref('/fcmTokens/' + memberID)
                .once('value', (token: any) => {
                  if (token.val()) {
                    const payload = {
                      data: {
                        GID: GID,
                        notification: 'groupchat',
                        senderEmail: userRecord.email,
                        chatID: CID,
                        senderID: message.senderID,
                        text: (message.message).toString(),
                        timeStamp: (message.timeStamp).toString()
                      }
                    }
                    if (memberID === message.senderID) {
                      return messaging.sendToDevice(token.val().token, payload);
                    } else {
                      return messaging.sendToDevice(token.val().token, {
                        data: payload.data,
                        notification: {
                          title: 'New Message',
                          body: (message.message).toString(),
                          icon: 'https://firebasestorage.googleapis.com/v0/b/police-dispatch-2ede5.appspot.com/o/logo.png?alt=media&token=7b0a6fc1-ded4-4ff0-a9d9-4703f18f1847'
                        }
                      });
                    }
                  }
                });
            }
          });
      });
  });

const singleChat = functions.database.ref('/singleChatMsgs/{chatID}/{msgID}')
  .onCreate((snap: any, context: any) => {
    const message = snap.val();
    const senderID = message.senderID;
    const reciverID = message.reciverID;
    const msgID = context.params.msgID;

    return db.ref('/fcmTokens/' + reciverID)
      .once('value', (reciverToken: any) => {
        if (reciverToken.val()) {
          const reciverPayload = {
            notification: {
              title: message.text,
              body: '',
              icon: 'https://firebasestorage.googleapis.com/v0/b/police-dispatch-2ede5.appspot.com/o/logo.png?alt=media&token=7b0a6fc1-ded4-4ff0-a9d9-4703f18f1847'
            },
            data: {
              notification: 'singleChat',
              msgNodeID: msgID,
              senderID: senderID,
              reciverID: reciverID,
              text: message.text,
              timeStamp: (message.timeStamp).toString()
            }
          }
          return messaging.sendToDevice(reciverToken.val().token, reciverPayload);
        }
      });
  });

const sosChatQueue = functions.database.ref('/SOSChats/{cityCode}/{chatID}')
  .onCreate((snap: any, context: any) => {
    const message = snap.val();
    const cityCode = context.params.cityCode;
    return db.ref('/usersOfficers/')
      .orderByChild('cityCode').equalTo(cityCode)
      .once('value', (userMeta: any) => {
        const user = userMeta.val();
        const keys = Object.keys(user);
        for (const key of keys) {
          db.ref('/fcmTokens/' + key)
            .once('value', (snapToken: any) => {
              const token = snapToken.val();

              if (token) {
                const payload = {
                  data: {
                    reciverID: key,
                    notification: 'sosChat',
                    ...message
                  }
                }
                return messaging.sendToDevice(token.token, payload);
              }
            });
        }
      });
  });

const sosCallQueue = functions.database.ref('/SOSCalls/{cityCode}/{callID}')
  .onCreate((snap: any, context: any) => {
    const call = snap.val();
    const cityCode = context.params.cityCode;

    return db.ref('/usersOfficers/')
      .orderByChild('cityCode').equalTo(cityCode)
      .once('value', (userMeta: any) => {
        const user = userMeta.val();

        // removing duplicate tokens
        const keys = Object.keys(user);

        for (const key of keys) {
          db.ref('/fcmTokens/' + key)
            .once('value', (snapToken: any) => {
              const token = snapToken.val();

              if (token) {
                const payload = {
                  notification: {
                    title: 'Testing',
                    body: '',
                    icon: 'https://firebasestorage.googleapis.com/v0/b/police-dispatch-2ede5.appspot.com/o/logo.png?alt=media&token=7b0a6fc1-ded4-4ff0-a9d9-4703f18f1847'
                  },
                  data: {
                    reciverID: key,
                    notification: 'sosCall',
                    ...call
                  }
                }
                messaging.sendToDevice(token.token, payload);
              }
            });
        }
      });
  });

export = {
  singleChat,
  groupChat,
  sosChatQueue,
  sosCallQueue
}