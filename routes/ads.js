const express = require('express');
const router = express.Router();
const config = require('../config/config');
const Blockcluster = require('blockcluster');
const shortid = require("shortid");
const express_jwt = require('express-jwt');

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.locationDomain, //enter your node's location domain
    instanceId: config.BLOCKCLUSTER.instanceId
});

let ads = [];
let interval = 1000;

setInterval(async function () {
    var allAds = await node.callAPI('assets/search', {
        $query: {
            assetName: "Ads",
            status: "open"
        },
    });

    var adsWithBanner = [];
    for (var i = 0; i < allAds.length; i++) {
        if (allAds[i].bannerUrl) {
            adsWithBanner.push(allAds[i]);
        }
    }

    ads = adsWithBanner;
    interval = 10000;
}, interval);

ApplyFilter = (ads, user) => {
    var filtered = [];
    for (var i = 0; i < ads.length; i++) {
        var filter = ads[i].filter;

        var ageFilter = true;
        if ((filter.ageLowerLimit || filter.ageUpperLimit) && user.age) {
            if (filter.ageLowerLimit && filter.ageUpperLimit) {
                ageFilter = filter.ageLowerLimit > user.age && filter.ageUpperLimit < user.age;
            }
            else if (filter.ageLowerLimit) {
                ageFilter = filter.ageLowerLimit < user.age;
            }
            else {
                ageFilter = filter.ageUpperLimit > user.age;
            }
            if (!ageFilter) break;
        }

        if (filter.country && user.location) {
            if (filter.country != user.location)
                break;
        }

        if (user.interests) {
            if (user.interests.length > 0 && filter.tags) {
                var op = filter.tags.filter(value => -1 !== user.interests.indexOf(value));
                if (op.length == 0) {
                    break;
                }
            }
        }

        filtered.push(ads[i]);
    }
    return filtered;
}

router.post('/publish', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    try {
        let ads_id = shortid.generate();
        var payload = req.user.payload;
        var userMetamaskAddress = payload.publicAddress;

        var userExists = await node.callAPI('assets/count', {
            $query: {
                assetName: 'Users',
                uniqueIdentifier: userMetamaskAddress.slice(2),
                status: "open",
            }
        });

        if (userExists == 0) {
            res.json({ message: "User does not exists!" });
        }

        await node.callAPI('assets/issueSoloAsset', {
            assetName: 'Ads',
            fromAccount: node.getWeb3().eth.accounts[0],
            toAccount: node.getWeb3().eth.accounts[0],
            identifier: ads_id
        });

        await node.callAPI('assets/updateAssetInfo', {
            assetName: 'Ads',
            fromAccount: node.getWeb3().eth.accounts[0],
            identifier: ads_id,
            public: {
                costPerView: req.body.costPerView, //how much advertiser pays per view
                filter: req.body.filter,
                bannerUrl: req.body.bannerUrl,
                uploader: userMetamaskAddress.slice(2) //user metamask id
            }
        });

        res.send({ success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.get('/banner', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    var payload = req.user.payload;
    var userMetamaskAddress = payload.publicAddress.slice(2);

    var user = await node.callAPI('assets/search', {
        $query: {
            assetName: 'Users',
            uniqueIdentifier: userMetamaskAddress,
            status: "open",
        }
    });

    var adCollection = ads;

    if (user.length > 0) {
        var filteredAds = ApplyFilter(adCollection, user);

        var final = filteredAds.length > 0 ? filteredAds : adCollection;
        var min = 0;
        var max = final.length - 1;
        var random = Math.floor(Math.random() * (+max - +min)) + +min;
        res.json(final[random]);
    }
    else {
        var min = 0;
        var max = adCollection.length - 1;
        var random = Math.floor(Math.random() * (+max - +min)) + +min;
        res.json(adCollection[random]);
    }

});

router.post('/get', async (req, res) => {
    try {
        const ads = await node.callAPI('assets/search', {
            assetName: "Ads",
            status: "open",
        });

        res.send({ data: ads, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.post('/getStats', async (req, res) => {
    try {
        var params = req.body;
        var ageQuery = {};
        var query = {
            assetName: "Users",
            status: "open",
        };

        if (params.ageUpperLimit) {
            ageQuery["$lte"] = parseInt(params.ageUpperLimit);
        }
        if (params.ageLowerLimit) {
            ageQuery["$gte"] = parseInt(params.ageLowerLimit);
        }
        if (params.ageUpperLimit || params.ageLowerLimit) {
            query["age"] = ageQuery;
        }
        if (params.country) {
            query["location"] = params.country;
        }

        const usersFound = await node.callAPI('assets/search', {
            $query: query,
        });
        params.tags = JSON.parse(JSON.stringify(params.tags).toLowerCase());
        var count = 0;
        var tags = [...params.tags];
        if (tags.length > 0) {
            for (var i = 0; i < usersFound.length; i++) {
                if (usersFound[i].interests) {
                    var op = tags.filter(value => -1 !== usersFound[i].interests.indexOf(value));
                    if (op.length > 0)
                        count++;
                }
                else {
                    count++;
                }
            }
        }
        else {
            count = usersFound.length;
        }

        res.send({ data: count, success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

module.exports = router;