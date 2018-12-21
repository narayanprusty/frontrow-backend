const express = require('express');
const router = express.Router();
const config = require('../config/config');
const Blockcluster = require('blockcluster');
const shortid = require("shortid");

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.locationDomain, //enter your node's location domain
    instanceId: config.BLOCKCLUSTER.instanceId
});

router.post('/add', async (req, res) => {
    try {
        let ads_id = shortid.generate();

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

router.post('/update', async (req, res) => {
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

router.post('/get', async (req, res) => {
    try {
        const ads = await node.callAPI('assets/search', {
            assetName: "Ads",
        });

        res.send({ data: ads, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

module.exports = router;