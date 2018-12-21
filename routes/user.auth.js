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

router.post('/add', async (req, res) => {
    try {
        let userMetamaskAddress = req.body.metamaskid //fetch it from metamask
        await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Users',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: userMetamaskAddress.slice(2)
        });

        res.send({ success: true });
    } catch (ex) {
        console.log(ex);
        res.json({ ex });
    }
});

router.post('/update', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    try {
        var payload = req.user.payload;

        var user = await db.User_Details.findOne({ publicAddress: payload.publicAddress });
        user["username"] = req.body.username;
        await user.save();

        //update username from all the video docs on blockcluster

        await node.callAPI('assets/updateAssetInfo', {
            assetName: 'Users',
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: payload.publicAddress.slice(2),
            public: {
                username: req.body.username,
                earned: req.body.earned, //how much user has earned watching videos
                age: req.body.age,
                location: req.body.location,
                interests: JSON.stringify(req.body.interests).toLowerCase()
            }
        });

        res.send({ success: true });
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/get', async (req, res) => {
    try {
        const users = await node.callAPI('assets/search', {
            assetName: "Users",
        });

        res.send({ data: users, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
})

router.post('/get/:publicAddress', async (req, res) => {
    try {

        var publicAddress = req.params.publicAddress

        console.log("add: " + publicAddress.slice(2).toString())

        const users = await node.callAPI('assets/search', {
            assetName: "Users",
            uniqueIdentifier: publicAddress.slice(2),
            status: "open",
        });

        await console.log("User: " + users[0])
        await res.send({ data: users, success: true })
    } catch (e) {
        console.error(e);
        res.send({ e })
    }
});

router.post('/getViaToken/:publicAddress', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    try {
        var payload = req.user.payload;
        console.log("sds: " + payload.publicAddress.slice(2).toString())

        const users = await node.callAPI('assets/search', {
            assetName: "Users",
            uniqueIdentifier: payload.publicAddress.slice(2)
        });

        res.send({ data: users, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
})

module.exports = router;