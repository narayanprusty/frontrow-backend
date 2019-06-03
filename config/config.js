var config = {
    BLOCKCLUSTER: {
        locationDomain: "app-ap-south-1b.blockcluster.io",
        instanceId: process.env.BC_INSTANCE_ID || 'sbtixarqpa'
    },
    JWTSecret: {
        secret: "asdfgh",
    },
    DB: {
        connectionString: process.env.MONGO_URL || "mongodb://localhost/frontrow",
    },
};

module.exports = config;