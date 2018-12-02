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
const aws_secret_access_key = "hxNxxoWJSS4PUAKLtMyuzum9SJAcYtzou2VisorL"
const node = new Blockcluster.Dynamo({
    locationDomain: 'app-ap-south-1b.blockcluster.io', //enter your node's location domain
    instanceId: 'fhvmdktd' //enter your instanceId
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
        key: function(req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname)
        }
    })
})

router.post('/user/add', async (req,res) => {

    let userMetamaskAddress = req.body.metamaskid //fetch it from metamask
	await node.callAPI('assets/issueSoloAsset', {
	    assetName: 'Users',
	    fromAccount: node.getWeb3().eth.accounts[0],
	    toAccount: node.getWeb3().eth.accounts[0],
	    identifier: userMetamaskAddress
    });
    
    res.send({success: true})

});

router.post('/user/update', async (req,res) => {

    let userMetamaskAddress = req.body.metamaskid;

    await node.callAPI('assets/updateAssetInfo', {
	    assetName: 'Users',
	    fromAccount: node.getWeb3().eth.accounts[0],
	    identifier: userMetamaskAddress,
			public: {
				earned: req.body.earned, //how much user has earned watching videos
                age: req.body.age,
                country: req.body.country,
                interests: JSON.stringify(req.body.interests)
		  }
    });
    
    res.send({success: true})

});

router.post('/user/get', async(req,res) => {

    const users = await node.callAPI('assets/search', {
		assetName: "Users",
	});

	res.send({data: users,success: true})

})

router.post('/adv/add', async(req,res) => {
  
    let ads_id = (Date.now()).toString()

    await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Ads',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: ads_id
        });

    res.send({success: true})

})

router.post('/adv/update', async(req,res) => {

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

    res.send({success: true})

})

router.post('/adv/get', async(req,res) => {

    const ads = await node.callAPI('assets/search', {
		assetName: "Ads",
	});

	res.send({data: ads,success: true})

})

router.post('/video/add', async(req,res) => {
    let video_id = (Date.now()).toString()

    await node.callAPI('assets/issueSoloAsset', {
	    assetName: 'Videos',
	    fromAccount: node.getWeb3().eth.accounts[0],
	    toAccount: node.getWeb3().eth.accounts[0],
	    identifier: video_id
    });
    
    res.send({success: true})
})

router.post('/video/update', async(req,res) => {

    let video_id = req.body.id;
    let userMetamaskAddress = req.body.metamaskid;

    await node.callAPI('assets/updateAssetInfo', {
        assetName: 'Videos',
        fromAccount: node.getWeb3().eth.accounts[0],
        identifier: video_id,
        public: {
          totalViews: req.body.views, //how many time video has been played
          imageURL: req.body.url,
          uploader: userMetamaskAddress, //user metamask id,
          title: req.body.id.title,
          publishedOn: (Date.now()).toString()
        }
    });

    res.send({success: true})

})

router.post('/video/get', async (req,res) => {

    const videos = await node.callAPI('assets/search', {
		assetName: "Videos",
	});

	res.send({data: video,success: true})

})

router.post('/api/upload', upload.single('video') , (req, res) => { 
    res.send({ path: req.file.location })
});

router.post('*',(req,res) => {
    res.status(404).send({success: false,message: 'Page does not exist!'});
});

router.get('*',(req,res) => {
    res.status(404).send({success: false,message: 'Page does not exist!'});
});

module.exports = router;
