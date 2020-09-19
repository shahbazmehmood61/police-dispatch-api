import * as express from "express";
import { ORMModel } from "../models/ORM.model";

const ormModel = new ORMModel();
const app = express();

app.post("/registerUser", (request, response) => {
  const body = request.body.form;
  const id = request.body.id;
  const node = request.body.node;

  if (id) {
    if (node === "mobilevictim") {
      ormModel
        .update("/usersMobile/" + id, body)
        .then(() => {
          return response.send({ msg: "User Updated!" });
        })
        .catch((error: any) => {
          return response.status(400).send({ code: error.message });
        });
    } else {
      ormModel
        .update("/usersWeb/" + id, body)
        .then(() => {
          return response.send({ msg: "User Added!" });
        })
        .catch((error: any) => {
          return response.status(400).send({ code: error.message });
        });
    }
  } else {
    ormModel
      .push("/usersWeb/", body)
      .then((res: any) => {
        // console.log(res['path'].pieces_[1]);
        const ID = res['path'].pieces_[1];
        return response.send({ id: ID, node: "webvictim" });
      })
      .catch((error: any) => {
        return response.status(400).send({ code: error.message });
      });
  }

});

app.get("/getRegisteredVictims", (request, response) => {
  // const authToken = request.get('Authorization')?.split('Bearer ')[1];

  new Promise((resolve, reject) => {
    const victims: Array<any> = [];

    ormModel
      .once("/usersWeb/")
      .then((webVictims: any) => {
        const respwebVictims = webVictims;
        let index = 0;
        if (respwebVictims) {
          const keyswebVictims = Object.keys(respwebVictims);
          for (const key of keyswebVictims) {
            victims.push({
              view: { node: "webvictim", key: key },
              ...respwebVictims[key],
            });
            index++;
          }
        }

        ormModel
          .once("/usersMobile/")
          .then((mobileVictims: any) => {
            const resp = mobileVictims;
            if (resp) {
              const keys = Object.keys(resp);
              for (const key of keys) {
                victims.push({
                  view: { node: "mobilevictim", key: key },
                  ...resp[key],
                });
                index++;
              }
              if (index === victims.length)
                // tslint:disable-next-line: no-void-expression
                return resolve(victims);
            }
          })
          .catch((error: any) => {
            reject(error);
          });
      })
      .catch((error: any) => {
        reject(error);
      });
  })
    .then((victims) => {
      return response.send(victims);
    })
    .catch((error) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getSingleVictim/:id/:node", (request, response) => {
  const id = request.params.id;
  const node = request.params.node;

  if (node === "webvictim") {
    ormModel
      .once("/usersWeb/" + id)
      .then((snapshot: any) => {
        return response.send(snapshot);
      })
      .catch((error: any) => {
        return response.status(400).send({ code: error.message });
      });
  } else if (node === "mobilevictim") {
    ormModel
      .once("/usersMobile/" + id)
      .then((snapshot: any) => {
        return response.send(snapshot);
      })
      .catch((error: any) => {
        return response.status(400).send({ code: error.message });
      });
  }
});

app.post("/registerIncident", (request, response) => {
  const body = request.body.body;
  const id = request.body.id;
  const city = request.body.city

  const officerId = body.officerId;
  const victimId = body.victimId;

  const sosCallId = request.body.sosCallId;

  ormModel
    .push("/incidentReports/" + id, body)
    .then((docs: any) => {
      ormModel
        .push("/officerReports/" + officerId, {
          victimId: victimId,
          reportId: docs.key,
        })
        .then(() => {
          if (sosCallId) {
            return ormModel
              .remove("/SOSCalls/" + city + "/" + sosCallId)
              .then(() => {
                ormModel.once('/SOSCalls/' + city)
                  .then((snap: any) => {
                    if (snap) {
                      const keys = Object.keys(snap);
                      const calls = [];
                      for (const key of keys) {
                        calls.push({ ...snap[key], nodeID: key });
                        if (calls.length === keys.length) response.send(calls);
                      }
                      return response.send(calls)
                    } else {
                      return response.send(null);
                    }
                  }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
              }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
          } else {
            return response.send({ msg: "Incident Reported" });
          }
        })
        .catch((error: any) => {
          return response.status(400).send({ code: error.message });
        });
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getIncidentReports/:id", (request, response) => {
  const id = request.params.id;
  ormModel
    .once("/incidentReports/" + id)
    .then((snapshot: any) => {
      if (snapshot) {
        const keys = Object.keys(snapshot);
        const report: Array<any> = [];
        for (const key of keys) {
          report.push({ key, ...snapshot[key] });
        }
        return response.send(report);
      } else {
        return response.status(400).send({ code: "No record found" });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getSingleIncidentDetails/:victimID/:incidentID", (request, response) => {
  const victimID = request.params.victimID;
  const incidentID = request.params.incidentID;

  ormModel
    .once("/incidentReports/" + victimID + "/" + incidentID)
    .then((snapshot: any) => {
      if (snapshot) {
        return response.send(snapshot);
      } else {
        return response.status(400).send({ code: "no record found" });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getOfficerRegisteredReports/:id", (req, res) => {
  const officerId = req.params.id;
  const data: Array<any> = [];
  const reports: Array<any> = [];
  ormModel
    .once("/officerReports/" + officerId)
    .then((docs: any) => {
      if (docs) {
        const keys = Object.keys(docs);
        for (const key of keys) {
          data.push({ key, ...docs[key] });
        }
        for (const value of data) {
          ormModel
            .once("/incidentReports/" + value.victimId + "/" + value.reportId)
            .then((doc: any) => {
              reports.push({ key: value.reportId, ...doc });

              if (data.length === reports.length) res.send(reports);
            })
            .catch((error: any) => {
              return res.status(400).send({ code: error.message });
            });
        }
      } else {
        res.status(400).send({ code: 'No reports found' });
      }
    })
    .catch((error: any) => {
      return res.status(400).send({ code: error.message });
    });
});

app.post("/updateIncidentReport/", (req, res) => {
  const body = req.body;

  if (!body.data) {
    ormModel
      .update("/incidentReports/" + body.victimId + "/" + body.id, {
        status: body.status,
      })
      .then(() => {
        return res.send({ msg: "Report Assigned" });
      })
      .catch((error: any) => {
        return res.status(400).send({ code: error.message });
      });
  } else {
    ormModel
      .set("/closedReports/" + body.id, body.data)
      .then(() => {
        ormModel
          .update("/incidentReports/" + body.victimId + "/" + body.id, {
            status: body.status,
          })
          .then(() => {
            return res.send({ msg: "Report Closed Successfully" });
          })
          .catch((error) => {
            return res.status(400).send({ code: error.message });
          });
      })
      .catch((error) => {
        return res.status(400).send({ code: error.message });
      });
  }
});

app.get("/getClosedReport/:key", (req, res) => {
  const key = req.params.key;
  ormModel
    .once("/closedReports/" + key)
    .then((val) => {
      return res.send(val);
    })
    .catch((error) => {
      return res.status(400).send({ code: error.message });
    });
});

// =========== SOS calls
app.post("/sendSosCall/", (request, response) => {
  const body = request.body;

  const postObject = {
    callerID: body.uid,
    cityCode: body.cityCode,
    phoneNumber: body.phoneNumber,
    lat: body.lat,
    lng: body.lng,
  };

  ormModel
    .readQueryData("/SOSCalls/" + body.cityCode, "callerID", body.uid)
    .then((callSnap: any) => {
      if (callSnap) {
        return response.status(400).send({ code: "You are already in caller queue" });
      } else {
        return ormModel
          .push("/SOSCalls/" + body.cityCode, postObject)
          .then(() => {
            ormModel
              .once("/cityCode/" + body.cityCode)
              .then((number: any) => {
                return response.send({ code: number.phoneNumber });
              })
              .catch((error: any) => {
                return response.status(400).send({ code: error.message });
              });
          })
          .catch((error: any) => {
            return response.status(400).send({ code: error.message });
          });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.post("/sendSosChat/", (request, response) => {
  const body = request.body;

  ormModel
    .once("/usersMobile/" + body.uid)
    .then((resp: any) => {
      const postObject = {
        callerID: body.uid,
        callerName:
          resp.firstName && resp.lastNam
            ? resp.firstName + " " + resp.lastNam
            : resp.email,
        cityCode: body.cityCode,
        phoneNumber: body.phoneNumber,
        lat: body.lat,
        lng: body.lng,
        chatText: body.chatText,
      };

      ormModel
        .readQueryData("/SOSChats/" + body.cityCode, "callerID", body.uid)
        .then((callSnap: any) => {
          if (callSnap) {
            return response.status(400).send({ code: "You are already in chat queue" });
          } else {
            return ormModel
              .push("/SOSChats/" + body.cityCode, postObject)
              .then(() => {
                ormModel
                  .once("/cityCode/" + body.cityCode)
                  .then((cityCode) => {
                    return response.send({ msg: cityCode });
                  })
                  .catch((error: any) => {
                    return response.status(400).send({ code: error.message });
                  });
              })
              .catch((error: any) => {
                return response.status(400).send({ code: error.message });
              });
          }
        })
        .catch((error: any) => {
          return response.status(400).send({ code: error.message });
        });
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getSosCall/:cityCode", (request, response) => {
  const cityCode = request.params.cityCode;
  ormModel
    .once("/SOSCalls/" + cityCode)
    .then((snap: any) => {
      if (snap) {
        const keys = Object.keys(snap);
        const calls = [];
        for (const key of keys) {
          calls.push({ ...snap[key], nodeID: key });
          if (calls.length === keys.length) response.send(calls);
        }
      } else {
        response.status(400).send({ code: "No record found" });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/getSosChat/:cityCode", (request, response) => {
  const cityCode = request.params.cityCode;
  ormModel
    .once("/SOSChats/" + cityCode)
    .then((snap: any) => {
      if (snap) {
        const keys = Object.keys(snap);
        const chats = [];
        for (const key of keys) {
          chats.push({ ...snap[key], nodeID: key });
          if (chats.length === keys.length) response.send(chats);
        }
      } else {
        response.status(400).send({ code: "No record found" });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

// getting single chat history for victim
app.get("/getSosChatHistory/:cityCode/:uid", (request, response) => {
  const cityCode = request.params.cityCode;
  const uid = request.params.uid;

  ormModel
    .readQueryData("/SOSChats/" + cityCode, "callerID", uid)
    .then((snap: any) => {
      if (snap) {
        response.send(snap);
      } else {
        response.status(400).send({ code: "No record found" });
      }
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/removeSosChat/:cityCode/:chatID", (request, response) => {
  const cityCode = request.params.cityCode;
  const chatID = request.params.chatID;

  ormModel
    .remove("/SOSChats/" + cityCode + "/" + chatID)
    .then(() => {
      return response.send({ msg: "Enlist Chat" });
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.get("/removeSosCall/:cityCode/:callID", (request, response) => {
  const cityCode = request.params.cityCode;
  const callID = request.params.callID;

  ormModel
    .remove("/SOSCalls/" + cityCode + "/" + callID)
    .then(() => {
      return response.send({ msg: "Enlist Call" });
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

app.post("/getLastSosChat", (request, response) => {
  const body = request.body;
  ormModel
    .readQueryData("/SOSChats/" + body.cityCode, "callerID", body.uid)
    .then((snap: any) => {
      const unwrap = Object.keys(snap);
      return response.send({ nodeID: unwrap[0], ...snap[unwrap[0]] });
    })
    .catch((error: any) => {
      return response.status(400).send({ code: error.message });
    });
});

export = app;