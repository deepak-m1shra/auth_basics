//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express()

app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(session({
    secret: 'Thisisultrasecret',
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect('mongodb://localhost:27017/userDB')

const userSchema = new mongoose.Schema({
    email: String,
    password: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = new mongoose.model('User', userSchema)

passport.use(User.createStrategy())

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'

},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

console.log(process.env.GOOGLE_CLIENT_ID)
console.log(process.env.GOOGLE_CLIENT_SECRET)
console.log(process.env.CALLBACK_URL)

app.get('/', (req, res) => {
    res.render("home")
})

app.get('/auth/google', function (req, res) {
    passport.authenticate('google', { scope: ['profile'] })
})

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

app.get('/login', (req, res) => {
    res.render("login")
})

app.post('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.post('/login', (req, res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.logIn(user, function (err) {
        if (err) {
            console.log(error)
        } else {
            passport.authenticate("local")
                (req, res, function () {
                    res.redirect("/secrets")
                })
        }
    })

})

app.get('/register', (req, res) => {
    res.render("register")
})

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets")
    } else {
        res.redirect("/login")
    }
})

app.post('/register', (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err)
            res.redirect("/register")
        } else {
            passport.authenticate("local")
                (req, res, function () {
                    res.redirect("/secrets")
                })
        }
    })
})

app.listen(3001, () => console.log('server is running at port ' + 3001))