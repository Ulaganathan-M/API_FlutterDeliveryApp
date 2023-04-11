

const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs");
const User = require('../models/user.model')
const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const fs= require('fs')
const nodemailer = require('nodemailer')
const otpGenerator = require('otp-generator')


// exports.register =asyncHandler(async(req,res) => {
    
//     const {name,email,password,confirm_password} = req.body
//     if(!name || !email || !password || !confirm_password){
//         res.status(400)
//         return res.render('register',{msg:"All fields are mandatory..", msg_type:"error"})
//     }
//     if(password!==confirm_password){
//         res.status(400)
//         return res.render('register',{msg:'confirm password not matched..',msg_type:"error"})
//     }
//     const userAvailable = await User.findOne({ email });
//     if(userAvailable){
//         res.status(400)
//         return res.render('register',{msg:'Email already Registered..',msg_type:"error"})
//     }else {
//         const hashPassword = await bcrypt.hash(password, 10);

//         const user = await User.create({
//                 name,
//                 email,
//                 password: hashPassword
//             })

//         return res.render('register',{msg:'Registeration Success!',msg_type:"success"})

//     }
    

// })

exports.register =asyncHandler(async(req,res) => {
    
    const {name,email,password} = req.body
    if(!name || !email || !password){
        return res.status(400).json({ error: 'All Fields are Mandatory.' });       
    }
    const userAvailable = await User.findOne({ email });
    if(userAvailable){
        return res.status(400).json({ error: 'Email already Registered.' });         
        // return res.render('register',{msg:'Email already Registered..',msg_type:"error"})
    }else {
        const hashPassword = await bcrypt.hash(password, 10);
        function generateOTP() {
            let otp = '';
            for (let i = 0; i < 6; i++) {
              otp += Math.floor(Math.random() * 10);
            }
            return otp;
          }

        const otp = generateOTP();
          console.log(otp);
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes
        const user = new User({
          name,
          email,
          password: hashPassword,
          otp,
          otpExpires,
        });

        try {
            await user.save();
        
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'ulagaoffice@gmail.com',
                pass: process.env.MAIL_PASS,
              },
            });
        
            const option = {
              from: 'ulagaoffice@gmail.com',
              to: email,
              subject: 'OTP for account activation',
              html: `
                <h1>Hi ${name}</h1>
                <h2>Your OTP for account activation is ${otp}. It is valid for 15 minutes.</h2>
              `,
            };
            await new Promise((resolve, reject) => {
              transporter.sendMail(option, (err, info) => {
                if (err) {
                  reject(err);
                } else {
                  console.log('Mail sent');
                  resolve();
                }
              });
            });
        
            return res.status(200).json({ email: email, success: 'OTP Sent.' });
          } catch (error) {
            console.error('Error registering user:', error);
            return res.status(500).send('Error registering user');
          }

    } 

})

exports.activateAccount=asyncHandler(async(req,res) => { 


    const { email, otp } = req.body;

    // Check if the email exists in the database
    const user = await User.findOne({ email });
   
  
    // Check if the OTP is valid and hasn't expired
    const currentTime = new Date();
    if (user.otp !== otp || currentTime > user.otpExpires) {
        return res.status(400).json({ error: 'Invalid OTP.' });
    } else if (user.otp == otp){
  
    // Activate the user's account
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(200).json({ success: 'Account activated.' });
    }
    
})

exports.login =asyncHandler(async(req,res) => { 
    try{
        const { email, password} = req.body;
        if(!email || !password) {
            return res.status(400).send("All fields are mandarory ");
        }
        const userDetails = await User.findOne({ email })

        if(!userDetails){
            return res.status(401).json({ error: 'Invalid email.' });
        }
        
        if(userDetails && (await bcrypt.compare(password, userDetails.password))) {
            const id = userDetails.email
            const token = jwt.sign({id: id}, 
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN}
            )

            const cookieOptions = {
                expires: new Date(Date.now()+process.env.JWT_COOKIE_EXPIRES * 24 * 60*60* 1000),
                httpOnly: true
            }
            res.cookie("usercookie",token,cookieOptions)
            
            return res.json({
                user: {
                  name: userDetails.name,
                  email: userDetails.email,
                  // Add any other relevant user details here
                },
              });            
        }else {
            return res.status(401).json({ error: 'Incorrect Password.' });
        }

    }catch(error){
        console.log(error);
        return res.status(500).send('Server error');
    }
})


exports.logout = asyncHandler(async(req,res,next) => {
    res.cookie("usercookie","logout",{
        expires: new Date(Date.now()+1*1000),
        httpOnly: true
    })
   
    return res.status(200).json({ success: 'Logout Successfully.' });

})

// exports.forgot =asyncHandler(async(req,res) => { 
//     try {
//     const { email, new_password, confirm_password} = req.body;
//     if( !email || !new_password || !confirm_password){
//         res.status(400)
//         return res.render('forgot',{msg:"All fields are mandatory..", msg_type:"error"})
//     }
//     const dbuser = await User.findOne({ email })

//     if(!dbuser){
//         res.status(400)
//         return res.render('forgot',{msg:'Invalid Email',msg_type:"error"})
//     }
//     if(new_password!==confirm_password){
//         res.status(400)
//         return res.render('forgot',{msg:'password not matched..',msg_type:"error"})
//     }
//     const hashPassword = await bcrypt.hash(new_password, 10);

//     await User.updateOne({ email:email },{password:hashPassword},(err,result) => {
//         if(err){
//             console.log(err);
//         }
//         return res.render('forgot',{msg:'password Changed..',msg_type:"success"})
//     })


//     }catch(error){
//     console.log(error);
// }


// })

exports.forgot =asyncHandler(async(req,res) => { 

    const { email } = req.body;
   
    const dbuser = await User.findOne({ email })

    if(!dbuser){
        return res.status(400).json({ error: 'Invalid Email Address.' });

    }


    function generateOTP() {
        let otp = '';
        for (let i = 0; i < 6; i++) {
          otp += Math.floor(Math.random() * 10);
        }
        return otp;
      }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // OTP valid for 15 minutes
    const updatedUser = await User.findOneAndUpdate(
        { email },
        { otp, otpExpires },
        { new: true }
      );
      
      if (!updatedUser) {
        return res.status(400).json({ error: 'Invalid Email Address.' });
      }

    try {
    
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ulagaoffice@gmail.com',
            pass: process.env.MAIL_PASS,
          },
        });
    
        const option = {
          from: 'ulagaoffice@gmail.com',
          to: email,
          subject: 'OTP for Fogot Password',
          html: `
            <h1>Hi ${dbuser.name}</h1>
            <h2>Your OTP for Fogot Password is ${otp}. It is valid for 15 minutes.</h2>
          `,
        };
        await new Promise((resolve, reject) => {
          transporter.sendMail(option, (err, info) => {
            if (err) {
              reject(err);
            } else {
              console.log('Mail sent');
              resolve();
            }
          });
        });
    
        return res.status(200).json({ success: 'OTP Sent.' });
      } catch (error) {
        console.error('Error validate user:', error);
        return res.status(500).send('Error validate user');
      }

})

exports.forgotActivate = asyncHandler(async(req,res) => { 

  const { email, otp } = req.body;

  // Check if the email exists in the database
  const user = await User.findOne({ email });
 

  // Check if the OTP is valid and hasn't expired
  const currentTime = new Date();
  if (user.otp !== otp || currentTime > user.otpExpires) {
      return res.status(400).json({ error: 'Invalid OTP.' });
  } else if (user.otp == otp){

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
  return res.status(200).json({ success: ' ' });
  }
  

})

exports.passwordChange = asyncHandler(async(req,res) => { 
    const { email, new_password } = req.body;

    const hashPassword = await bcrypt.hash(new_password, 10);
    const dbuser = await User.findOne({ email });

    if(dbuser){
      await User.updateOne({ email:email },{password:hashPassword})
      return res.status(200).json({ success: 'Password Changed.' });
    } else {
      return res.status(400).json({ error: 'Error Try again.' });

    }
})

exports.edit = asyncHandler(async(req,res,next) => {

    if(req.cookies.usercookie) {

        try{
            const decode= await promisify(jwt.verify)(
                req.cookies.usercookie,
                process.env.JWT_SECRET)
            
            const useremail = decode.id
            const dbuser = await User.findOne({ email:useremail })

            if(req.body.name && req.file){
                const imageBuffer = fs.readFileSync(req.file.path);

                // store the image buffer as binary data in MongoDB
                await User.updateOne(
                { email: useremail },
                {
                    name: req.body.name,
                    avatar: {
                    data: imageBuffer,
                    contentType: req.file.mimetype,
                    },
                },
                (err, result) => {
                    if (err) {
                    console.log(err);
                    }
                    return res.status(200).redirect("/profile");
                }
                );
                

                // await User.updateOne({ email:useremail },{name:req.body.name, avatar:req.file.filename},(err,result) => {
                //     if(err){
                //         console.log(err);
                //     }
                //     filename=dbuser.avatar
                //     fs.unlink('public/uploads/'+filename,(err)=>{
                //         if(err){
                //             console.log(err);
                //         }
                //     })
                //     res.status(200).redirect("/profile")
                // })

            }

            else if(req.body.name){
                      
                await User.updateOne({ email:useremail },{name:req.body.name },(err,result) => {
                    if(err){
                        console.log(err);
                    }
                    res.status(200).redirect("/profile")
                })
            }
            else if(req.file){
                const imageBuffer = fs.readFileSync(req.file.path);

                // store the image buffer as binary data in MongoDB
                await User.updateOne(
                { email: useremail },
                {
                    avatar: {
                    data: imageBuffer,
                    contentType: req.file.mimetype,
                    },
                },
                (err, result) => {
                    if (err) {
                    console.log(err);
                    }
                    return res.status(200).redirect("/profile");
                }
                );
                
                // await User.updateOne({ email:useremail },{avatar: req.file.filename},(err,result) => {

                //     if(err){
                //         console.log(err);
                //     }
                //     // filename=dbuser.avatar
                //     // fs.unlink('public/uploads/'+filename,(err)=>{
                //     //     if(err){
                //     //         console.log(err);
                //     //     }
                //     // })

                //     res.status(200).redirect("/profile")
                // })
            }else{
                return res.render('edit',{user: dbuser, msg:"Invalid Inputs", msg_type:"error"})
            }
            
        }catch(error){
            console.log(error);
            
        }

    } else {
        next()
    }
  
    
    })

exports.resetPassword = asyncHandler(async(req,res) => {

    const {userId} = req.params
    const old_password = req.body.old_password.trim()
    const new_password = req.body.new_password.trim()
    const confirm_password = req.body.confirm_password.trim()
    const dbuser = await User.findOne({ _id:userId })

    if(!old_password || !new_password|| !confirm_password){
        return res.render('resetPass',{user:dbuser, msg:"All fields are mandatory..", msg_type:"error"})
    }
    if(new_password !== confirm_password){
        return res.render('resetPass',{user:dbuser, msg:"Password Not Matched..", msg_type:"error"})

    }
    if(dbuser && (await bcrypt.compare(old_password, dbuser.password))) {
        const hashPassword = await bcrypt.hash(new_password, 10);
        await User.updateOne({ email:dbuser.email },{password:hashPassword})
        return res.render('resetPass',{user:dbuser, msg:'Password Changed Successfully..',msg_type:"success"})



    }else{
        return res.render('resetPass',{user:dbuser, msg:'Incorrect Password!',msg_type:"error"})

    }
    

})

exports.delete =asyncHandler(async(req,res) => { 
        console.log("delete");
        const {userId} = req.params
        const dbuser = await User.findOne({ _id:userId })
        if(dbuser){
            await User.deleteOne({ _id: userId});
            return res.render('login',{msg:'Account Deleted Successfully',msg_type:"success"})

        }
        return res.render('login',{msg:'Error Try again!',msg_type:"error"})

        
        


})

