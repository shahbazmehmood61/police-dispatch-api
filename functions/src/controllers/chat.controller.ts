import * as express from 'express';
import { ORMModel } from '../models/ORM.model';
import { ORMAuth } from '../models/ORMAuth.model';
import * as firebase from 'firebase';

const ormModel = new ORMModel();
const ormAuth = new ORMAuth();
const app = express();

// ============ Get Methods
app.get('/getMessage/:chatID', (request, response) => {
    const chatID = request.params.chatID;

    return ormModel.once('/singleChatMsgs/' + chatID)
        .then((snapshot: any) => {
            if (snapshot) {
                return response.send({ chat: snapshot });
            } else {
                return response.status(400).send({ code: 'No Chat History' });
            }
        }).catch((error: any) => { return response.status(400).send({ code: error.message }); })

});

app.get('/getChatRoomIDs/:uid', (request, response) => {
    const uid = request.params.uid;
    // console.log(uid);
    return ormModel.once('/singleChatRoomUsers/' + uid)
        .then((snapshot: any) => {
            if (snapshot) {
                const keys = Object.keys(snapshot);
                const chatIDs: any[] = [];

                let i = 1;
                for (const key of keys) {
                    ormModel.once('/singleChatRooms/' + snapshot[key])
                        .then((snap: any) => {
                            const resp = snap;
                            for (const memberKey of Object.keys(resp.members)) {
                                if (memberKey !== uid) {
                                    console.log(memberKey);
                                    chatIDs.push({
                                        chatID: snapshot[key],
                                        chatNodeID: key,
                                        lastMsg: resp.lastMsg,
                                        reciverID: memberKey,
                                        reciverName: resp.members[memberKey],
                                        timeStamp: resp.timeStamp,
                                        chatInitDate: resp.chatInitDate,
                                    });
                                }
                            }
                            if (i === keys.length) {
                                return response.send(chatIDs);
                            }
                            i++;
                            return;
                        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                }
                return;
            } else {
                return response.status(400).send({ code: 'No chat' });
            }
        }).catch((error: any) => { return response.status(400).send({ code: error.message }); })
});

// ============ Set Methods
app.post('/genrateChatRoomIDs', (request, response) => {
    const body = request.body;

    ormAuth.getUser(body.reciverID)
        .then((userRecord: any) => {
            const resp = userRecord.toJSON();
            const initChatRoom = {
                members: {
                    [body.reciverID]: resp.displayName ? resp.displayName : resp.email,
                    [body.senderID]: body.senderName
                },
                lastMsg: '',
                timeStamp: '',
                chatInitDate: firebase.database.ServerValue.TIMESTAMP
            };

            ormModel.push('/singleChatRooms/', initChatRoom)
                .then((snap: any) => {
                    new Promise((resolve, reject) => {
                        let i = false;
                        ormModel.push('/singleChatRoomUsers/' + body.reciverID, snap.key)
                            .then(() => { i = true; })
                            .catch((error: any) => { return response.status(400).send({ code: error.message }); });
                        ormModel.push('/singleChatRoomUsers/' + body.senderID, snap.key)
                            .then((senderSnap: any) => {
                                ormModel.remove('/SOSChats/NewYork/' + body.sosChatID).then(() => {
                                    if (i) {
                                        resolve(senderSnap.key);
                                    }
                                }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                            }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                    }).then((chatNodeID: any) => {
                        return response.send({
                            chatID: snap.key,
                            chatNodeID: chatNodeID,
                            lastMsg: '',
                            // reciverID: body.senderID,
                            reciverID: body.reciverID,
                            // reciverName: initChatRoom.members[body.senderID],
                            reciverName: initChatRoom.members[body.reciverID],
                            timeStamp: '',
                            picture: userRecord.photoURL ? userRecord.photoURL : 'https://ptetutorials.com/images/user-profile.png'
                        });
                    }).catch((error: any) => {
                        return response.status(400).send({ code: error.message });
                    });
                })
                .catch((error: any) => { return response.status(400).send({ code: error.message }); });
        })
        .catch((error: any) => { return response.status(400).send({ code: error.message }); });
});

app.post('/sendMessage', (request, response) => {
    const body = request.body;
    body.timeStamp = firebase.database.ServerValue.TIMESTAMP;

    const ref1 = '/singleChatMsgs/' + body.chatID;
    const ref2 = '/singleChatRooms/' + body.chatID;
    delete body.chatID;

    new Promise((resolve, reject) => {
        let i = false;
        ormModel.update(ref2, {
            lastMsg: body.text,
            timeStamp: body.timeStamp,
        }).then(() => {
            i = true;
        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
        ormModel.push(ref1, body)
            .then((roomSnap: any) => {
                if (i) {
                    resolve(roomSnap.key);
                }
            }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
    }).then((msgNodeID: any) => {
        return response.send({
            msgNodeID: msgNodeID,
            reciverID: body.reciverID,
            senderID: body.senderID,
            text: body.text,
        });
    }).catch((error: any) => {
        return response.status(400).send({ code: error.message });
    });
});

// ============ Others
app.post('/updateMessagingToken', (request, response) => {
    // const authToken = request.get('Authorization')?.split('Bearer ')[1];

    const body = request.body;
    if (body.uid) {
        return ormModel.set('/fcmTokens/' + body.uid, { token: body.token })
            .then(() => { return response.send({ msg: 'Token Updated' }); })
            .catch((error: any) => { return response.status(400).send({ code: error.message }); });
    } else {
        return response.status(400).send({ code: 'User not loggedin' });
    }
});

app.post('/searchByEmail', (request, response) => {
    const body = request.body;
    if (body.email) {
        return ormAuth.getUserByEmail(body.email)
            .then((userRecord: any) => {
                const details = {
                    name: userRecord.displayName ? userRecord.displayName : userRecord.email,
                    email: userRecord.email,
                    uid: userRecord.uid,
                    picture: userRecord.photoURL ? userRecord.photoURL : 'https://ptetutorials.com/images/user-profile.png'
                };
                return response.send(details);
            }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
    } else {
        return response.status(400).send({ code: 'Please enter email address' });
    }
});

app.get('/searchByUID/:uid', (request, response) => {
    const uid = request.params.uid;
    return ormAuth.getUser(uid)
        .then((userRecord: any) => {
            return response.send(userRecord.toJSON());
        }).catch((error: any) => {
            return response.status(400).send({ code: error.message });
        });
});

// ============ Group Chat
app.post('/createGroup', (request, response) => {
    const body = request.body;
    body.createdTime = firebase.database.ServerValue.TIMESTAMP;

    ormModel.push('/groupDetail', body)
        .then((snapshot: any) => {
            let i = 1;
            for (const memberID of body.members) {
                ormModel.push('/groupChatRoomIDs/' + memberID, snapshot.key)
                    .then(() => {
                        if (i === body.members.length)
                            return response.send({ msg: 'group created' });
                        return i++;
                    }).catch((error: any) => {
                        return response.status(400).send({ code: error.message });
                    });
            }
        }).catch((error: any) => {
            return response.status(400).send({ code: error.message });
        });

});

app.post('/sendGroupMessage/:GID', (request, response) => {
    const body = request.body;
    const GID = request.params.GID;
    const recentMsg = {
        sender: body.senderEmail,
        message: body.message
    };

    delete body.senderEmail;
    body.timeStamp = firebase.database.ServerValue.TIMESTAMP;
    ormModel.push('/groupMessage/' + GID, body)
        .then(() => {
            ormModel.set('/groupDetail/' + GID + '/recentMessages', recentMsg)
                .then(() => { return response.send({ msg: 'message sent' }); })
                .catch((error: any) => { return response.status(400).send({ code: error.message }); });
        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
});

app.get('/getGroups/:UID', (request, response) => {
    const UID = request.params.UID;
    ormModel.once('/groupChatRoomIDs/' + UID)
        .then((snapShot: any) => {
            const resp = snapShot;
            const keys = Object.keys(snapShot);
            let i = 1;
            const groups: any[] = [];
            for (const key of keys) {
                ormModel.once('/groupDetail/' + resp[key])
                    .then((snap: any) => {
                        groups.push({ ...snap, GID: resp[key] });
                        if (i === keys.length)
                            return response.send(groups);
                        return i++;
                    })
                    .catch(() => { return response.status(400).send({ code: 'No chat' }); });
            }
        })
        .catch(() => { return response.status(400).send({ code: 'No chat Room' }); });
});

// app.get('/getGroupMessages/:GID', (request, response) => {
//     const GID = request.params.GID;

//     ormModel.once('/groupMessage/' + GID)
//         .then((snapShot: any) => {
//             ormModel.once('/groupDetail/' + GID + '/members')
//                 .then((snap: any) => {
//                     const members: any[] = [];
//                     let i = 1;
//                     for (const memberID of snap) {
//                         ormAuth.getUser(memberID)
//                             .then((userRecord: any) => {
//                                 members.push({ email: userRecord.email, uid: memberID });

//                                 if (i === snap.length)
//                                     return response.send({ members: members, messages: snapShot });
//                                 return i++;
//                             }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
//                     }

//                 }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
//         }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
// });

// ============ Close Chat
app.post('/closeChat', (request, response) => {
    const body = request.body;

    const officerID = body.officerID;
    const officerChatNodeID = body.chatNodeID;
    const victimID = body.victimID;
    const chatID = body.chatID;

    const refSingleChatMsgs = 'singleChatMsgs/' + chatID;
    const refSingleChatRoomOfficerID = 'singleChatRoomUsers/' + officerID + '/' + officerChatNodeID;
    const refSingleChatRoomVictimID = 'singleChatRoomUsers/' + victimID;
    const refSingleChatRooms = 'singleChatRooms/' + chatID;

    ormModel.once(refSingleChatMsgs)
        .then((singleChatMsgsSnap: any) => {
            ormModel.set('/closedChats/singleChatMsgs/' + chatID, singleChatMsgsSnap)
                .then(() => {
                    ormModel.push('/closedChats/singleChatRoomUsers/' + victimID + '/' + officerID, chatID)
                        .then(() => {
                            ormModel.once(refSingleChatRooms)
                                .then((refSingleChatRoomsSnap: any) => {
                                    ormModel.set('/closedChats/singleChatRooms/' + chatID, refSingleChatRoomsSnap)
                                        .then(() => {
                                            ormModel.once(refSingleChatRoomVictimID)
                                                .then((singleChatRoomVictimIDSnap: any) => {
                                                    const singleChatRoomVictimIDResp = singleChatRoomVictimIDSnap;
                                                    for (const key in singleChatRoomVictimIDResp) {
                                                        if (singleChatRoomVictimIDResp.hasOwnProperty(key)) {
                                                            if (singleChatRoomVictimIDResp[key] === chatID) {
                                                                delete singleChatRoomVictimIDResp[key];
                                                            }
                                                        }
                                                    }
                                                    ormModel.set(refSingleChatRoomVictimID, singleChatRoomVictimIDResp)
                                                        .then(() => {
                                                            ormModel.remove(refSingleChatRoomOfficerID).then(() => { }).catch(() => { });
                                                            ormModel.remove(refSingleChatMsgs).then(() => { }).catch(() => { });
                                                            ormModel.remove(refSingleChatRooms).then(() => { }).catch(() => { });
                                                            return response.send({ msg: 'Chat Closed' });
                                                        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                                                }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                                        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                                }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
});

app.get('/getClosedChatRoomIDs/:uid/:victimID', (request, response) => {
    const victimID = request.params.victimID;
    const officerID = request.params.uid;
    ormModel.once('/closedChats/singleChatRoomUsers/' + victimID + '/' + officerID)
        .then((snapshot: any) => {
            if (snapshot) {
                const keys = Object.keys(snapshot);
                const chatIDs: any[] = [];

                let i = 1;
                for (const key of keys) {
                    ormModel.once('/closedChats/singleChatRooms/' + snapshot[key])
                        .then((snap: any) => {
                            const resp = snap;
                            const membersKeys = Object.keys(resp.members);
                            for (const memberKey of membersKeys) {
                                if (memberKey !== officerID) {
                                    chatIDs.push({
                                        chatID: snapshot[key],
                                        chatNodeID: key,
                                        lastMsg: resp.lastMsg,
                                        reciverID: memberKey,
                                        reciverName: resp.members[memberKey],
                                        timeStamp: resp.timeStamp
                                    });
                                }
                            }
                            if (i === keys.length) {
                                return response.send(chatIDs);
                            }
                            i++;
                            return;
                        }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
                }
                return;
            } else {
                return response.status(400).send({ code: 'No chat' });
            }
        })
        .catch((error: any) => { return response.status(400).send({ code: error.message }); });
});

app.get('/getClosedtMessage/:chatID', (request, response) => {
    const chatID = request.params.chatID;

    ormModel.once('/closedChats/singleChatMsgs/' + chatID)
        .then((snapshot: any) => {
            if (snapshot) {
                return response.send({ chat: snapshot });
            } else {
                return response.status(400).send({ code: 'No Chat History' });
            }
        })
        .catch(() => { return response.status(400).send({ code: 'No Chat History' }); });

});

export = app;