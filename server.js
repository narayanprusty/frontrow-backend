const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const index = require('./routes/index');
const db = require('./db/model');
const app = express();
const config = require('./config/config');
const port = 7000;


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/', index);
mongoose.connect(config.DB.connectionString, { useNewUrlParser: true }).then(function (data) {
    console.log("database set up")
}).catch(function (err) {
    console.log(err)
});

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(err.status).send({ message: err.message });
        console.log(err);
        return;
    }
    next();
});

app.listen(port, function () {
    console.log("Listening to port " + port);
});
