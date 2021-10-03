//////////////////////////NODE MODULE///////////////////
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const mongodbClient = require('mongodb');
const nodemailer = require('nodemailer');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const createError = require('http-errors')
var cron = require('node-cron');

/////////////////////////CONST CREATION/////////////////
const app = express();

////////////////////////PORT///////////////////////////
const PORT = process.env.PORT || 3000;

/////////////////////////APP SET & USE/////////////////////
app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

////////////////////////SCHEMA///////////////////////
mongoose.connect(process.env.MONGO_URL,{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set('useCreateIndex',true);
const mailSchema = new mongoose.Schema({
    to: String,
    cc: String,
    subject: String,
    schedule: String,
    body: String
});
const historySchema = new mongoose.Schema({
    to: String,
    cc: String,
    date: { type: Date, default: Date.now }
});
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    name: String,
    daily: [ mailSchema ],
    weekly: [ mailSchema ],
    monthly: [ mailSchema ],
    yearly: [ mailSchema ],
    dailyHistory: [ historySchema ],
    weeklyHistory: [ historySchema ],
    monthlyHistory: [historySchema ],
    yearlyHistory: [ historySchema ]
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model('User',userSchema);
const Mail = new mongoose.model('Mail',mailSchema);
const Send = new mongoose.model('Send',historySchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
////////////////////////GOOGLE AUTHOMTICATION///////////////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://mailrocket.herokuapp.com/auth/google/mailrocket",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //   console.log(profile);
    User.findOrCreate({ googleId: profile.id,username:profile.emails[0].value,name: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));
/////////////////////////SCHEDULER////////////////////
cron.schedule('*/30 * * * * *', () => { //DAILY SCHEDULER
    User.find(function(err,userCollection){
        if(err){
            console.log(err);
        }else{
            userCollection.forEach(function(users){
                if(users.daily.length){
                    //USER DATA
                    var FROM = users.name;
                    var TO =  users.daily[0].to;
                    var CC = users.daily[0].cc;
                    var SUBJECT = users.daily[0].subject;
                    var BODY = users.daily[0].body;

                    //NODE MAILER
                    var transporter = nodemailer.createTransport({
                       service: 'gmail',
                       auth: {
                         user: process.env.MYEMAIL,
                         pass: process.env.MAILPASSWORD
                       },
                       tls: {
                           rejectUnauthorized: false
                       }
                     });
                     
                     var mailOptions = {
                       from: `${FROM}`,
                       to: `${TO}`,
                       cc: `${CC}`,
                       subject: `${SUBJECT}`,
                       html: `<div>
                       <p>${BODY}</p>
                       <img src="https://image.flaticon.com/icons/png/512/4144/4144781.png" alt="Girl in a jacket" width="50" height="50" style="display:inline-block">
                       <p style="display:inline-block">This Mail Was Send By Mail Rocket</p>
                       </div>`
                     };
                     
                     transporter.sendMail(mailOptions, function(error, info){
                       if (error) {
                         console.log(error);
                       } else {
                        //  console.log('Email sent: ' + info.response);
                         var dailyHistoryMail = new Send({
                            to: TO,
                            cc: CC,
                            date: Date.now()
                         });
                         dailyHistoryMail.save();
                         users.dailyHistory.push(dailyHistoryMail);
                         users.save();
                       }
                     });
                    // console.log(users.name);
                    // console.log("--------------------------------------------------------------------------------");
                    users.daily.push(users.daily[0]);
                    users.daily.shift();
                    users.save();
                }
            });
        }
    });
});
cron.schedule('* * * * * sunday', () => { //WEEKLY SCHEDULER
    User.find(function(err,userCollection){
        if(err){
            console.log(err);
        }else{
            userCollection.forEach(function(users){
                if(users.weekly.length){
                    //USER DATA
                    var FROM = users.name;
                    var TO =  users.weekly[0].to;
                    var CC = users.weekly[0].cc;
                    var SUBJECT = users.weekly[0].subject;
                    var BODY = users.weekly[0].body;

                    //NODE MAILER
                    var transporter = nodemailer.createTransport({
                       service: 'gmail',
                       auth: {
                         user: process.env.MYEMAIL,
                         pass: process.env.MAILPASSWORD
                       },
                       tls: {
                           rejectUnauthorized: false
                       }
                     });
                     
                     var mailOptions = {
                       from: `${FROM}`,
                       to: `${TO}`,
                       cc: `${CC}`,
                       subject: `${SUBJECT}`,
                       html: `<div>
                       <p>${BODY}</p>
                       <img src="https://image.flaticon.com/icons/png/512/4144/4144781.png" alt="Girl in a jacket" width="50" height="50" style="display:inline-block">
                       <p style="display:inline-block">This Mail Was Send By Mail Rocket</p>
                       </div>`
                     };
                     
                     transporter.sendMail(mailOptions, function(error, info){
                       if (error) {
                         console.log(error);
                       } else {
                        //  console.log('Email sent: ' + info.response);
                         var weeklyHistoryMail = new Send({
                            to: TO,
                            cc: CC,
                            date: Date.now()
                         });
                         weeklyHistoryMail.save();
                         users.weeklyHistory.push(weeklyHistoryMail);
                         users.save();
                       }
                     });
                    // console.log(users.name);
                    // console.log("--------------------------------------------------------------------------------");
                    users.weekly.push(users.weekly[0]);
                    users.weekly.shift();
                    users.save();
                }
            });
        }
    });
});
  
cron.schedule('0 0 1 * *', () => { //MONTHLY SCHEDULER
    User.find(function(err,userCollection){
        if(err){
            console.log(err);
        }else{
            userCollection.forEach(function(users){
                if(users.monthly.length){
                    //USER DATA
                    var FROM = users.name;
                    var TO =  users.monthly[0].to;
                    var CC = users.monthly[0].cc;
                    var SUBJECT = users.monthly[0].subject;
                    var BODY = users.monthly[0].body;

                    //NODE MAILER
                    var transporter = nodemailer.createTransport({
                       service: 'gmail',
                       auth: {
                         user: process.env.MYEMAIL,
                         pass: process.env.MAILPASSWORD
                       },
                       tls: {
                           rejectUnauthorized: false
                       }
                     });
                     
                     var mailOptions = {
                       from: `${FROM}`,
                       to: `${TO}`,
                       cc: `${CC}`,
                       subject: `${SUBJECT}`,
                       html: `<div>
                       <p>${BODY}</p>
                       <img src="https://image.flaticon.com/icons/png/512/4144/4144781.png" alt="Girl in a jacket" width="50" height="50" style="display:inline-block">
                       <p style="display:inline-block">This Mail Was Send By Mail Rocket</p>
                       </div>`
                     };
                     
                     transporter.sendMail(mailOptions, function(error, info){
                       if (error) {
                         console.log(error);
                       } else {
                        //  console.log('Email sent: ' + info.response);
                         var monthlyHistoryMail = new Send({
                            to: TO,
                            cc: CC,
                            date: Date.now()
                         });
                         monthlyHistoryMail.save();
                         users.monthlyHistory.push(monthlyHistoryMail);
                         users.save();
                       }
                     });
                    // console.log(users.name);
                    // console.log("--------------------------------------------------------------------------------");
                    users.monthly.push(users.monthly[0]);
                    users.monthly.shift();
                    users.save();
                }
            });
        }
});
});
  
cron.schedule('* * * Jan Sun', () => { //YEARLY SCHEDULER
    User.find(function(err,userCollection){
        if(err){
            console.log(err);
        }else{
            userCollection.forEach(function(users){
                if(users.yearly.length){
                    //USER DATA
                    var FROM = users.name;
                    var TO =  users.yearly[0].to;
                    var CC = users.yearly[0].cc;
                    var SUBJECT = users.yearly[0].subject;
                    var BODY = users.yearly[0].body;

                    //NODE MAILER
                    var transporter = nodemailer.createTransport({
                       service: 'gmail',
                       auth: {
                         user: process.env.MYEMAIL,
                         pass: process.env.MAILPASSWORD
                       },
                       tls: {
                           rejectUnauthorized: false
                       }
                     });
                     
                     var mailOptions = {
                       from: `${FROM}`,
                       to: `${TO}`,
                       cc: `${CC}`,
                       subject: `${SUBJECT}`,
                       html: `<div>
                       <p>${BODY}</p>
                       <img src="https://image.flaticon.com/icons/png/512/4144/4144781.png" alt="Girl in a jacket" width="50" height="50" style="display:inline-block">
                       <p style="display:inline-block">This Mail Was Send By Mail Rocket</p>
                       </div>`
                     };
                     
                     transporter.sendMail(mailOptions, function(error, info){
                       if (error) {
                         console.log(error);
                       } else {
                        //  console.log('Email sent: ' + info.response);
                         var yearlyHistoryMail = new Send({
                            to: TO,
                            cc: CC,
                            date: new Date().toISOString().slice(0, 10)
                         });
                         yearlyHistoryMail.save();
                         users.yearlyHistory.push(yearlyHistoryMail);
                         users.save();
                       }
                     });
                    // console.log(users.name);
                    // console.log("--------------------------------------------------------------------------------");
                    users.yearly.push(users.yearly[0]);
                    users.yearly.shift();
                    users.save();
                }
            });
        }
});
});

/////////////////////////ROUTE////////////////////////
app.route('/') //FRONT PAGE ROUTE
.get(function(req,res){
    res.render('Home');
})

app.route('/login') //LOGIN ROUTE
.get(function(req,res){
    res.render('index',{wrongpass:""});
})
.post(function(req,res){
    User.findOne({username:req.body.username},function(err,userFound){
        if(err){
            res.render('index',{wrongpass:"ERROR, Try Again!"});
        } else {
            if(userFound) {
                const userLogin = new User({
                    username: req.body.username,
                    password: req.body.password
                });
                req.logIn(userLogin,function(err){
                    if(err){
                        console.log(err);
                        res.redirect('/login');
                    }else{
                        passport.authenticate("local")(req,res,function(){
                            res.redirect('/home');
                        });
                    }
                });
            } else {
                res.render('index',{wrongpass:"User Doesn't Exist!"});
            }
        }
    });
});

app.get('/auth/google', //GOOGLE AUTH ROUTE
  passport.authenticate('google', {  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
] }));

app.get('/auth/google/mailrocket', //GOOGLE AUTH REDIRECT ROUTE
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/home');
  });

app.route('/signup') //SIGN UP ROUTE
.get(function(req,res){
    res.render('Sign-up',{userExist:""});
})
.post(function(req,res){
    if(req.body.password === req.body.confirmpassword){
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.render('Sign-up',{userExist:"Some Error Occured!"});
            } else {
                if(userFound){
                    console.log(req.body.username);
                    res.render('Sign-up',{userExist:"User Already Exist!"});
                } else {
                    User.register({username:req.body.username,name: req.body.name},req.body.password,function(err,user){
                        if(err){
                            console.log(err);
                            res.redirect('/login');
                        } else{
                            passport.authenticate('local')(req,res,function(){
                                res.redirect('/login');
                            });
                        }
                    });
                }
            }
        });
    } else {
        res.render('Sign-up',{userExist:"Password Not Matched!"});
    }
});

app.route('/home') //HOME PAGE
.get(function(req,res){
    if(req.isAuthenticated()){
        res.render('UserPage',{userName:req.user.name,dailyList:req.user.daily,weeklyList:req.user.weekly,monthlyList:req.user.monthly,yearlyList:req.user.yearly,from:req.user.username});
    }else{
        res.redirect('/login');
    }
});

app.route('/about')
.get(function(req,res){
    res.render('about');
});

app.route('/signout') // SIGN OUT ROUTE
.get(function(req,res){
    req.logOut();
    res.redirect('/');
});

app.route('/createmail') //CREATE EMAIL ROUTE
.post(function(req,res){
    var to = req.body.to;
    var cc = req.body.cc;
    var subject = req.body.subject;
    var schedule = req.body.schedule;
    var message = req.body.message;
    var newMail = new Mail({
        to: to,
        cc: cc,
        subject: subject,
        schedule: schedule,
        body: message
    });
    newMail.save();
    const logedUser = req.user;
    if(schedule==='daily'){
        logedUser.daily.push(newMail);
        logedUser.save();
    } else if(schedule==='weekly'){
        logedUser.weekly.push(newMail);
        logedUser.save();
    } else if(schedule==='monthly'){
        logedUser.monthly.push(newMail);
        logedUser.save();
    } else{
        logedUser.yearly.push(newMail);
        logedUser.save();
    }
    res.redirect('/home');
});

app.route('/update')
.post(function(req,res){ //GET DATA ABOUT MAIL ROUTE
    var id = req.body.updateid;
    Mail.findOne({_id:req.body.updateid},function(err,mailFound){
        if(err){
            res.redirect('/home');
        } else {
            res.render('updatemail',{from:req.user.username,to:mailFound.to,cc:mailFound.cc,subject:mailFound.subject,id:id,schedule:mailFound.schedule});
        }
    });
});

app.route('/updatemail') //UPDATE MAIL DETAIL ROUTE
.post(function(req,res){
    var to = req.body.to;
    var cc = req.body.cc;
    var subject = req.body.subject;
    var message = req.body.message;
    var schedule = req.body.schedule;
    if(schedule=='daily'){
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'daily._id': req.body.updateid},{'$set':{
                    'daily.$.to':to,
                    'daily.$.cc':cc,
                    'daily.$.subject':subject,
                    'daily.$.body':message
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    } else if (schedule=='weekly') {
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'weekly._id': req.body.updateid},{'$set':{
                    'weekly.$.to':to,
                    'weekly.$.cc':cc,
                    'weekly.$.subject':subject,
                    'weekly.$.body':message
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    } else if (schedule=='monthly') {
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'monthly._id': req.body.updateid},{'$set':{
                    'monthly.$.to':to,
                    'monthly.$.cc':cc,
                    'monthly.$.subject':subject,
                    'monthly.$.body':message
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    } else {
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'yearly._id': req.body.updateid},{'$set':{
                    'yearly.$.to':to,
                    'yearly.$.cc':cc,
                    'yearly.$.subject':subject,
                    'yearly.$.body':message
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    }
    
});

app.route('/history') // EMAIL HISTORY ROUTE
.get(function(req,res){
    if(req.isAuthenticated()){
        res.render('history',{dailyList:req.user.dailyHistory,weeklyList:req.user.weeklyHistory,monthlyList:req.user.monthlyHistory,yearlyList:req.user.yearlyHistory});
    } else{
        res.redirect('/login');
    }
});

app.route('/delete')
.post(function(req,res){
    if(req.body.schedule === 'daily'){
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'daily._id': req.body.updateid},{'$pull':{
                    'daily': {'_id': req.body.updateid}
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    }else if(req.body.schedule === 'weekly'){
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'weekly._id': req.body.updateid},{'$pull':{
                    'weekly': {'_id': req.body.updateid}
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    }else if(req.body.schedule === 'monthly'){
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'monthly._id': req.body.updateid},{'$pull':{
                    'monthly': {'_id': req.body.updateid}
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    }else{
        User.findOne({username:req.body.username},function(err,userFound){
            if(err){
                res.redirect('/home');
            } else {
                User.updateOne({'yearly._id': req.body.updateid},{'$pull':{
                    'yearly': {'_id': req.body.updateid}
                }},function(err){
                    res.redirect('/home');
                });
            }
        });
    }
});

///////////////////////////////LISTEN///////////////////////
app.listen(PORT,function(){
    console.log(`Server Started at Port ${PORT}`);
});
