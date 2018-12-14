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
const sigUtil =  require('eth-sig-util');
const jwt = require('jsonwebtoken');
const express_jwt = require('express-jwt')

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

router.post('/user/update',express_jwt({ secret: "asdfgh" }),
    async (req,res) => {

    var payload = req.user.payload;

    await node.callAPI('assets/updateAssetInfo', {
	    assetName: 'Users',
	    fromAccount: node.getWeb3().eth.accounts[0],
	    identifier: payload.publicAddress,
			public: {
                username: req.body.username,
				earned: req.body.earned, //how much user has earned watching videos
                age: req.body.age,
                location: req.body.location,
                interests: JSON.stringify(req.body.interests)
		  }
    });
    
    res.send({success: true})

});

router.post('/user/get',
 async(req,res) => {

    const users = await node.callAPI('assets/search', {
		assetName: "Users",
	});

	res.send({data: users,success: true})

})

router.post('/user/get/:publicAddress',
    async(req,res) => {

    try {

        var publicAddress = req.params.publicAddress

        console.log("add: " + parseFloat(publicAddress) )

        const users = await node.callAPI('assets/search', {
            assetName: "Users",
            uniqueIdentifier: parseFloat(publicAddress)
        });
        
        await console.log("User: " + users)
        await res.send({data: users,success: true})
    } catch(e) {
        console.error(e);
        res.send({success: false})
    }

})

router.post('/user/getViaToken/:publicAddress',express_jwt({ secret: "asdfgh" }),
async(req,res) => {

    var payload = req.user.payload;
    console.log("sds: " + parseInt(payload.publicAddress))

    const users = await node.callAPI('assets/search', {
        assetName: "Users",
        uniqueIdentifier: parseInt(payload.publicAddress)
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
    
    await res.send({success: true,vid: video_id})
})

router.post('/video/update',express_jwt({ secret: "asdfgh" }), async(req,res) => {

    let video_id = req.body.id;
    
    await node.callAPI('assets/updateAssetInfo', {
        assetName: 'Videos',
        fromAccount: node.getWeb3().eth.accounts[0],
        identifier: video_id,
        public: {
          totalViews: 0, //how many time video has been played
          imageURL: req.body.imageURL,
          uploader: req.user.payload.publicAddress, //user metamask id,
          title: req.body.title,
          video: req.body.videoURL,
          publishedOn: (Date.now()).toString()
        }
    });

    await res.send({success: true})

})

router.post('/video/get', async (req,res) => {
    console.log("cc")
    const videos = await node.callAPI('assets/search', {
		assetName: "Videos",
	});

	res.send({data: videos,success: true})

})

router.post('/auth', (req,res,next) => {
        const { signature, publicAddress } = req.body;
        if (!signature || !publicAddress) {
            return res
            .status(400)
            .send({ success: false , error: 'Request should have signature and publicAddress' });
        }
           
        return (
          db.User_Details.findOne({publicAddress:  publicAddress })
            .then(user => {
              if (!user)
                return res.status(401).send({success: false});
              return user;
            })
            
            .then(user => {
              const msg = `I am signing my one-time nonce: ${user.nonce}`;
      
              const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
              const address = sigUtil.recoverPersonalSignature({data: msgBufferHex, sig: signature})
      
              if (address.toLowerCase() === publicAddress.toLowerCase()) {
                return user;
              } else {
                return res
                  .status(401)
                  .send({ success: false,error: 'Signature verification failed' });
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
                return res.send({token:  accessToken }) 
            })
            .catch(next)
        );

})

router.get('/users',(req,res,next) => {

  return db.User_Details.find({publicAddress: req.query.publicAddress})
    .then(function(users){
        if(!users) {
            return res.send({users: []})
        }
        res.send({users: users})
    })
    .catch(next);
})

router.post('/users',async (req,res,next) => {

    let userMetamaskAddress = req.body.publicAddress //fetch it from metamask
    
    await node.callAPI('assets/issueSoloAsset', {
	    assetName: 'Users',
	    fromAccount: node.getWeb3().eth.accounts[0],
	    toAccount: node.getWeb3().eth.accounts[0],
	    identifier: userMetamaskAddress
    });

    db.User_Details.create(req.body)
        .then(user => res.json(user))
        .catch(next);
})

router.patch('/users/:userId',express_jwt({ secret: "asdfgh" }),(req,res,next) => {

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

})

router.get('/users/:userId',express_jwt({ secret: "asdfgh" }),(req,res,next) => {

    if (req.user.payload.id !== req.params.userId) {
        return res.status(401).send({ error: 'You can can only access yourself' });
      }
      return db.User_Details.findById(req.params.userId)
        .then(user => {
          res.send({data: user})
        })
        .catch(next);

})

router.post('/users/:userId',express_jwt({ secret: "asdfgh" }),(req,res) => {

    if (req.user.payload.id !== +req.params.userId) {
        return res.status(401).send({ error: 'You can can only access yourself',success:false });
      }
    return db.User_Details.findById(req.params.userId)
    .then(user => res.json(user))
    .catch(next);

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
