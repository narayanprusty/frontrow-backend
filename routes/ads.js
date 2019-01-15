const express = require('express');
const router = express.Router();
const config = require('../config/config');
const Blockcluster = require('blockcluster');
const shortid = require("shortid");
const express_jwt = require('express-jwt');
let jwt = require('jsonwebtoken');

let checkToken = async (req) => {
    try {
        let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }

        if (token) {
            var op = await jwt.verify(token, config.JWTSecret.secret);
            if (!op.payload) {
                return { success: false };
            } else {
                return { success: true, payload: op.payload };
            }
        } else {
            return { success: false };
        }
    } catch (ex) {
        return { success: false };
    }
};

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.locationDomain, //enter your node's location domain
    instanceId: config.BLOCKCLUSTER.instanceId
});

let ads = [];
let interval = 10000;

setInterval(async function () {
    console.log("Caching ads!");
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
                views: 0,
                uploader: userMetamaskAddress.slice(2) //user metamask id
            }
        });

        res.send({ success: true })
    } catch (ex) {
        console.log(ex);
        res.json(ex);
    }
});

router.get('/banner', async (req, res) => {
    try {
        if (ads.length == 0)
            res.sendStatus(200);
        else {
            var verification = await checkToken(req);
            var userMetamaskAddress = "";
            var user = {};
            if (verification.success) {
                userMetamaskAddress = verification.payload.publicAddress.slice(2);
                user = await node.callAPI('assets/search', {
                    $query: {
                        assetName: 'Users',
                        uniqueIdentifier: userMetamaskAddress,
                        status: "open",
                    }
                });
            }

            var adCollection = ads;

            if (user.length > 0) {
                var filteredAds = ApplyFilter(adCollection, user);

                var final = filteredAds.length > 0 ? filteredAds : adCollection;
                var min = 0;
                var max = final.length - 1;
                var random = Math.round(Math.random() * max * 10000) % (max + 1)
                res.json(final[random]);
            }
            else {
                var min = 0;
                var max = adCollection.length - 1;
                var random = Math.round(Math.random() * max * 10000) % (max + 1)
                res.json(adCollection[random]);
            }
        }
    } catch (ex) {
        console.log(ex);
        res.sendStatus(400);
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

router.get('/adsStats', express_jwt({ secret: config.JWTSecret.secret }), async (req, res) => {
    try {
        var payload = req.user.payload;
        var userMetamaskAddress = payload.publicAddress.slice(2);
        var userAds = await node.callAPI('assets/search', {
            assetName: 'Ads',
            uploader: userMetamaskAddress.toString(),
            status: "open"
        });

        res.json(userAds);
    } catch (ex) {
        console.log(ex);
        res.sendStatus(400);
    }
})

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

router.post('/seen', async (req, res) => {
    try {
        var verification = await checkToken(req);
        var userMetamaskAddress = verification.success ? verification.payload.publicAddress.slice(2) : "";
        if (req.body.adId && req.body.vId) {
            //Update ad views
            var ad = await node.callAPI("assets/search", {
                assetName: 'Ads',
                uniqueIdentifier: req.body.adId,
                status: "open",
            });
            if (ad.length == 0) {
                throw { message: "Ad not found => " + req.body.adId };
            }
            var views = ad[0]["views"] ? ad[0].views + 1 : 1;

            await node.callAPI('assets/updateAssetInfo', {
                assetName: 'Ads',
                fromAccount: node.getWeb3().eth.accounts[0],
                identifier: ad[0].uniqueIdentifier,
                public: {
                    views: views
                }
            });

            //Update video earnings
            var video = await node.callAPI("assets/search", {
                assetName: 'Videos',
                uniqueIdentifier: req.body.vId,
                status: "open",
            });
            if (video.length == 0) {
                throw { message: "Video not found => " + req.body.vId };
            }
            var earning = video[0]["earning"] ? video[0].earning + (ad[0].costPerView * 0.3) : (ad[0].costPerView * 0.3);
            var adsPopped = video[0]["adsPopped"] ? video[0]["adsPopped"] + 1 : 1;

            await node.callAPI('assets/updateAssetInfo', {
                assetName: 'Videos',
                fromAccount: node.getWeb3().eth.accounts[0],
                identifier: video[0].uniqueIdentifier,
                public: {
                    earning: earning,
                    adsPopped: adsPopped
                }
            });

            if (userMetamaskAddress) {
                //Update user earnings
                var user = await node.callAPI("assets/search", {
                    assetName: 'Users',
                    uniqueIdentifier: userMetamaskAddress,
                    status: "open",
                });
                if (user.length == 0) {
                    throw { message: "user not found => " + userMetamaskAddress };
                }
                var userEarning = user[0]["earning"] ? user[0].earning + (ad[0].costPerView * 0.7) : (ad[0].costPerView * 0.7);
                var adsSeen = user[0]["adsSeen"] ? user[0]["adsSeen"] + 1 : 1;

                await node.callAPI('assets/updateAssetInfo', {
                    assetName: 'Users',
                    fromAccount: node.getWeb3().eth.accounts[0],
                    identifier: userMetamaskAddress,
                    public: {
                        earning: userEarning,
                        adsSeen: adsSeen
                    }
                });
            }

            res.sendStatus(200);
        } else {
            throw { message: "Required parameters missing!" };
        }
    }
    catch (ex) {
        console.log(ex);
        res.sendStatus(400);
    }
});

module.exports = router;