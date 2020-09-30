import * as express from 'express';
import { IRegisterOfficer } from '../utils/interfaces/IAuth.model';
import { AuthModel } from '../models/auth.model';

const authModel = new AuthModel();
const app = express();

app.post('/signin', (request, response) => {
    const body = request.body;
    authModel.signin(body)
        .then((userMeta: any) => {
            return response.send(userMeta);
        })
        .catch((error: any) => {
            return response.status(400).send(error);
        });
});

app.get('/logout', (request, response) => {
    authModel.logout().then(() => {
        return response.send({ msg: 'User Loggedout' });
    }).catch((error: any) => { return response.status(400).send({ code: error.message }); });
});

app.post('/checkUserLogin', (request, response) => {
    const authToken = request.get('Authorization')?.split('Bearer ')[1];
    const uid = request.body.uid;

    authModel.checkUserLogin(uid, authToken)
        .then((decodedToken: any) => {
            return response.send(decodedToken);
        }).catch((error: any) => {
            return response.status(400).send(error);
        });
});

app.post('/signup', (request, response) => {
    const body = request.body;

    authModel.signup(body).then((userMeta) => {
        return response.send(userMeta);
    }).catch((error: any) => { return response.status(400).send(error); });

});

app.post('/postSocialAccountsData', (request, response) => {
    const body = request.body;
    const postObject = {
        cellNumber: body.cellNumber,
        directions: body.directions,
        driverLicenseImage: body.driverLicenseImage,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        middleInitial: body.middleInitial,
        secondLastName: body.secondLastName,
    };

    authModel.postSocialAccountsData(body, postObject).then((data) => {
        return response.send(data);
    }).catch((error: any) => { return response.status(400).send(error); });
});

app.post('/forgetpassword', (request, response) => {
    const body = request.body;
    authModel.forgetpassword(body)
        .then((data) => { return response.send(data) })
        .catch((error: any) => { return response.status(400).send(error); });
});

app.post('/registerOfficer', (request, response) => {
    const body = request.body;
    const register: IRegisterOfficer = {
        name: body.name,
        email: body.email,
        lat: body.lat,
        lng: body.lng,
        // city: body.city,
        cityCode: body.cityCode,
        role: body.role
    }

    authModel.registerOfficer(body, register)
        .then((data) => { return response.send(data); })
        .catch((error: any) => { return response.status(400).send(error); });
});

export = app;