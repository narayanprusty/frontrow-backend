const express = require('express');
const router = express.Router();
const db = require('../db/model');
const Blockcluster = require('blockcluster');
const express_jwt = require('express-jwt');
const shortid = require("shortid");
const config = require('../config/config');

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.locationDomain, //enter your node's location domain
    instanceId: config.BLOCKCLUSTER.instanceId
});

router.get('/', (req, res, next) => {
    try {
        return db.User_Details.find({ publicAddress: req.query.publicAddress })
            .then(function (users) {
                if (!users) {
                    return res.send({ users: [] })
                }
                res.send({ users: users })
            })
            .catch(err => {
                console.log(err);
                return next(err);
            });
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/', async (req, res, next) => {
    try {
        let userMetamaskAddress = req.body.publicAddress //fetch it from metamask
        await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Users',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: userMetamaskAddress.toString().slice(2)
        });

        req.body["username"] = userMetamaskAddress.toString();
        db.User_Details.create(req.body)
            .then(user => {
                return res.json(user);
            })
            .catch(err => {
                console.log(err);
                return next(err);
            });
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.patch('/:userId', express_jwt({ secret: config.JWTSecret.secret }), (req, res, next) => {
    try {
        if (req.user.payload.id !== +req.params.userId) {
            return res.status(401).send({ error: 'You can can only access yourself' });
        }
        return db.User_Details.findById(req.params.userId)
            .then(user => {
                Object.assign(user, req.body);
                return user.save();
            })
            .then(user => res.json(user))
            .catch(next);
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.get('/:userId', express_jwt({ secret: config.JWTSecret.secret }), (req, res, next) => {
    try {
        if (req.user.payload.id !== req.params.userId) {
            return res.status(401).send({ error: 'You can can only access yourself' });
        }
        return db.User_Details.findById(req.params.userId)
            .then(user => {
                res.send({ data: user })
            })
            .catch(next);
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/:userId', express_jwt({ secret: config.JWTSecret.secret }), (req, res) => {
    try {
        if (req.user.payload.id !== +req.params.userId) {
            return res.status(401).send({ error: 'You can can only access yourself', success: false });
        }
        return db.User_Details.findById(req.params.userId)
            .then(user => res.json(user))
            .catch(next);
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

module.exports = router;