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
    let video_id = shortid.generate();
    try {
        await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Videos',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: video_id.toString()
        });

        res.send({ success: true, vid: video_id })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/update', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    try {
        let video_id = req.body.id;

        var user = await db.User_Details.findOne({ publicAddress: req.user.payload.publicAddress });

        if (user) {
            var username = user.username.toString().substring(0, 2) == "0x" ? user.username.toString().substring(2) : user.username.toString();
            await node.callAPI('assets/updateAssetInfo', {
                assetName: 'Videos',
                fromAccount: node.getWeb3().eth.accounts[0],
                identifier: video_id.toString(),
                public: {
                    totalViews: 0, //how many time video has been played
                    imageURL: req.body.imageURL,
                    uploader: user.publicAddress.slice(2), //user metamask id,
                    title: req.body.title,
                    video: req.body.videoURL,
                    publishedOn: (Date.now()).toString(),
                    show: true
                }
            });

            res.send({ success: true })
        }
        else {
            res.status(400).send("User not found!");
        }
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/view/update', async (req, res) => {
    try {
        let video_id = req.body.id;

        await node.callAPI('assets/updateAssetInfo', {
            assetName: 'Videos',
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: video_id.toString(),
            public: {
                totalViews: req.body.views,
            }
        });

        res.send({ success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/get', async (req, res) => {
    try {
        console.log("cc")
        const video = await node.callAPI('assets/search', {
            $query: {
                assetName: "Videos",
                status: "open",
                show: true,
            },
            $sort: {
                publishedOn: -1
            }
        });

        for (var i = 0; i < video.length; i++) {
            var user = await node.callAPI('assets/search', {
                assetName: "Users",
                uniqueIdentifier: video[i].uploader
            });
            if(user.length > 0){
                video[i]["username"] = user[0].username;
            }
        }

        res.send({ data: video, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/get/:vid', async (req, res) => {
    try {

        var vid = req.params.vid
        console.log(vid);
        const video = await node.callAPI('assets/search', {
            assetName: "Videos",
            uniqueIdentifier: vid.toString()
        });

        console.log("Video: " + video)
        res.send({ data: video, success: video.length > 0 })
    } catch (e) {
        console.error(e);
        res.json({ e });
    }
});

module.exports = router;