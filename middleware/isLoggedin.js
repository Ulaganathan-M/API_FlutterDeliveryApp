const asyncHandler = require("express-async-handler")
const User = require('../models/user.model')
const jwt = require('jsonwebtoken')
const { promisify } = require('util')



const isLoggedIn = asyncHandler(async(req,res,next) => {
    if(req.cookies.usercookie) {

        try{
            const decode= await promisify(jwt.verify)(
                req.cookies.usercookie,
                process.env.JWT_SECRET)
            
            const useremail = decode.id
           
            const dbuser = await User.findOne({ email:useremail })
          
            if(!dbuser) {
                return next()
            }
            req.user = dbuser;
            return next()         

        }catch(error){
            console.log(error);
            return next()
        }

    } else {
        next()
    }
    

})

module.exports = isLoggedIn;