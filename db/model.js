const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User_Details_Schema = new Schema({
    nonce: {
        type: Number,
        default: Math.floor(Math.random() * 1000000)           
        },
      publicAddress: {
        type: String,
        unique: true
      },
      username: {
        type: String,
        unique: true
      }
})

var User_Details = mongoose.model('user_details',User_Details_Schema);

module.exports =  {
    User_Details: User_Details
};
