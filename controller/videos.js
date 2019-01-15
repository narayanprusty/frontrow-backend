const Blockcluster = require('blockcluster');
const config = require('../config/config');

const node = new Blockcluster.Dynamo({
    locationDomain: config.BLOCKCLUSTER.locationDomain, //enter your node's location domain
    instanceId: config.BLOCKCLUSTER.instanceId
});

var videos = [];

let interval = 20000;

setInterval(async function () {
    try {
        console.log("Caching Videos!")
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
            if (user.length > 0) {
                video[i]["username"] = user[0].username;
            }
        }
        videos = video;
    } catch (ex) {
        console.log(ex);
    }
}, interval);

getVideos = () => {
    return videos;
}

pushNewVideo = (video) => {
    videos.push(video);
}

cacheVideos = (videoList) => {
    videos = videoList;
} 

module.exports = {
    getVideos,
    pushNewVideo,
    cacheVideos,
}