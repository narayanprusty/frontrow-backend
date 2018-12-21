const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const db = require('../db/model');
const cors = require('cors');
const multerS3 = require('multer-s3');
const multer = require('multer')
const AWS = require('aws-sdk');
const Blockcluster = require('blockcluster');
const ethUtil = require('ethereumjs-util');
const sigUtil = require('eth-sig-util');
const jwt = require('jsonwebtoken');
const express_jwt = require('express-jwt');
const shortid = require("shortid");

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.urlencoded({ extended: true }))
router.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Origin', 'http://localhost:7000');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});
router.use(cors());

const aws_access_key_id = "AKIAICV5P2PGKZ2JF26Q"
const aws_secret_access_key = "hxNxxoWJSS4PUAKLtMyuzum9SJAcYtzou2VisorL"
const node = new Blockcluster.Dynamo({
    locationDomain: 'app-ap-south-1b.blockcluster.io', //enter your node's location domain
    instanceId: 'qrdcrigi' //enter your instanceId
});

AWS.config.update({
    accessKeyId: aws_access_key_id,
    secretAccessKey: aws_secret_access_key,
    region: 'us-east-2'
});

const s3 = new AWS.S3();

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'frontrow-blockcluster',
        key: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname)
        }
    })
})

//User Routes

router.post('/user/add', async (req, res) => {
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

router.post('/user/update', express_jwt({ secret: "asdfgh" }), async (req, res) => {
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
                interests: JSON.stringify(req.body.interests)
            }
        });

        res.send({ success: true });
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/user/get', async (req, res) => {
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

router.post('/user/get/:publicAddress', async (req, res) => {
    try {

        var publicAddress = req.params.publicAddress

        console.log("add: " + publicAddress.slice(2).toString())

        const users = await node.callAPI('assets/search', {
            assetName: "Users",
            uniqueIdentifier: publicAddress.slice(2),
            status: "open",
        });

        await console.log("User: " + users)
        await res.send({ data: users, success: true })
    } catch (e) {
        console.error(e);
        res.send({ e })
    }
});

router.post('/user/getViaToken/:publicAddress', express_jwt({ secret: "asdfgh" }), async (req, res) => {
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

//Ads routes

router.post('/adv/add', async (req, res) => {
    try {
        let ads_id = (Date.now()).toString()

        await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Ads',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: ads_id
        });

        res.send({ success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
})

router.post('/adv/update', async (req, res) => {
    try {
        let userMetamaskAddress = req.body.metamaskid;
        let ads_id = req.body.id;

        await node.callAPI('assets/updateAssetInfo', {
            assetName: 'Ads',
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: ads_id,
            public: {
                costPerView: req.body.cost, //how much advertiser pays per view
                totalViews: req.body.views, //for how many times advertiser wants to show the video
                seen: req.body.seen, //how many times people have seen this ad
                filter: JSON.stringify(req.body.filter),
                startAge: req.body.startAge,
                endAge: req.body.endAge,
                country: req.body.country,
                imageURL: req.body.url,
                uploader: userMetamaskAddress //user metamask id
            }
        });

        res.send({ success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
})

router.post('/adv/get', async (req, res) => {
    try {
        const ads = await node.callAPI('assets/search', {
            assetName: "Ads",
        });

        res.send({ data: ads, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
})

//Video routes

router.post('/video/add', async (req, res) => {
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
})

router.post('/video/update', express_jwt({ secret: "asdfgh" }), async (req, res) => {
    try {
        let video_id = req.body.id;

        var user = await db.User_Details.findOne({ publicAddress: req.user.payload.publicAddress });

        if (user) {
            var username = user.username.toString().substring(0, 2) == "0x" ? user.username.toString().substring(0, 2) : user.username.toString();
            await node.callAPI('assets/updateAssetInfo', {
                assetName: 'Videos',
                fromAccount: node.getWeb3().eth.accounts[0],
                identifier: video_id.toString(),
                public: {
                    totalViews: 0, //how many time video has been played
                    imageURL: req.body.imageURL,
                    uploader: user.publicAddress, //user metamask id,
                    username: username,
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

router.post('/video/get', async (req, res) => {
    try {
        console.log("cc")
        const video = await node.callAPI('assets/search', {
            assetName: "Videos",
            status: "open",
            show: true,
        });

        res.send({ data: video, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/video/get/:vid', async (req, res) => {
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
})

//Auth

router.post('/auth', (req, res, next) => {
    const { signature, publicAddress } = req.body;
    try {
        if (!signature || !publicAddress) {
            return res
                .status(400)
                .send({ success: false, error: 'Request should have signature and publicAddress' });
        }

        return (
            db.User_Details.findOne({ publicAddress: publicAddress })
                .then(user => {
                    if (!user)
                        return res.status(401).send({ success: false });
                    return user;
                })

                .then(user => {
                    const msg = `I am signing my one-time nonce: ${user.nonce}`;

                    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
                    const address = sigUtil.recoverPersonalSignature({ data: msgBufferHex, sig: signature })

                    if (address.toLowerCase() === publicAddress.toLowerCase()) {
                        return user;
                    } else {
                        return res
                            .status(401)
                            .send({ success: false, error: 'Signature verification failed' });
                    }
                })

                .then(user => {
                    user.nonce = Math.floor(Math.random() * 10000);
                    return user.save();
                })

                .then(
                    user =>
                        new Promise((resolve, reject) =>
                            jwt.sign(
                                {
                                    payload: {
                                        id: user.id,
                                        publicAddress
                                    }
                                },
                                "asdfgh", // jwt secret
                                null,
                                (err, token) => {
                                    if (err) {
                                        return reject(err);
                                    }

                                    return resolve(token);
                                }
                            )
                        )
                )
                .then(accessToken => {
                    return res.send({ token: accessToken })
                })
                .catch(next)
        );
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

//users routes

router.get('/users', (req, res, next) => {
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
})

router.post('/users', async (req, res, next) => {
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
})

router.patch('/users/:userId', express_jwt({ secret: "asdfgh" }), (req, res, next) => {
    try {
        if (req.user.payload.id !== +req.params.userId) {
            return res.status(401).send({ error: 'You can can only access yourself' });
        }
        return User.findById(req.params.userId)
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
})

router.get('/users/:userId', express_jwt({ secret: "asdfgh" }), (req, res, next) => {
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
})

router.post('/users/:userId', express_jwt({ secret: "asdfgh" }), (req, res) => {
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
})

//upload api

router.post('/api/upload', upload.single('video'), (req, res) => {
    try {
        res.send({ path: req.file.location });
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('*', (req, res) => {
    res.status(404).send({ success: false, message: 'Page does not exist!' });
});

router.get('*', (req, res) => {
    res.status(404).send({ success: false, message: 'Page does not exist!' });
});

module.exports = router;
