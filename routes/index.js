const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const db = require('../db/model');
const path = require('path');
const cors = require('cors');
const multerS3 = require('multer-s3');
const multer = require('multer')
const AWS = require('aws-sdk');
const Blockcluster = require('blockcluster');

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.urlencoded({ extended: true }))
router.use(function(req, res, next) {
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
const aws_secret_access_key = "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"

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
        key: function(req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname)
        }
    })
})

router.post('/api/upload', upload.single('video') , (req, res) => { 
    res.send({ path: req.file.location })
})

router.post('*',(req,res) => {
    res.status(404).send({success: false,message: 'Page does not exist!'});
})

router.get('*',(req,res) => {
    res.status(404).send({success: false,message: 'Page does not exist!'});
})

module.exports = router;
