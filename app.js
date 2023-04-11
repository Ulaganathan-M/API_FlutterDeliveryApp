const express = require('express');
const path = require('path')
const dotenv = require("dotenv").config()
const connectDb = require('./config/mongoDB')
const bodyparser = require('body-parser')
const cors = require('cors');
const User = require('./models/user.model')



connectDb()
const app = express();
app.use(cors())
app.use(bodyparser.json());


app.use(bodyparser.urlencoded({extended:false}))  //it is importent to get req boy from browser

app.use('/', require('./routes/user.route'))

const deleteExpiredUsers = async () => {
    try {
      const expiredUsers = await User.find({ otpExpires: { $lte: new Date() }, isVerified: false });
      if (expiredUsers.length > 0) {
        console.log(`Deleting ${expiredUsers.length} expired users`);
        for (const user of expiredUsers) {
          await User.deleteOne({ _id: user._id });
        }
        console.log('Expired users deleted successfully');
      }
        const expiredOTP = await User.find({ otpExpires: { $lte: new Date() }, isVerified: true });
        if (expiredOTP.length > 0) {
          console.log(`Deleting ${expiredUsers.length} expired otp`);
          for (const user of expiredVerifiedUsers) {
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
          }
          console.log('Expired users deleted successfully');
          

      } else {
        console.log('No expired users found');
      }
    } catch (error) {
      console.error('Error deleting expired users:', error);
    }
  };
  
  // Call deleteExpiredUsers function every hour
  setInterval(deleteExpiredUsers, 60 * 1000);

app.listen(3000, () => {
    console.log("Server runs at port 3000");
})
