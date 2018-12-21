const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const db = require('../db/model');
const cors = require('cors');
const multerS3 = require('multer-s3');
const multer = require('multer')
const AWS = require('aws-sdk');
const ethUtil = require('ethereumjs-util');
const sigUtil = require('eth-sig-util');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const users = require('./users');
const video = require('./videos');
const user = require('./user.auth');
const ads = require('./ads');

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

AWS.config.update({
    accessKeyId: config.AWS.aws_access_key_id,
    secretAccessKey: config.AWS.aws_secret_access_key,
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

router.use('/user', user);

//Ads routes

router.use('/adv', ads);

//Video routes

router.use('/video', video);

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
                                config.JWTSecret.secret, // jwt secret
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

router.use('/users', users);

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
