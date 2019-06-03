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
    AWS: {	
        aws_access_key_id: "AKIA5XOL3DOJQ5ZDDPXM",	
        aws_secret_access_key: "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"	
    },
};

module.exports = config;