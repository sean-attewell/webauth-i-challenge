const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Users = require('./users/users-model.js');
const server = express();
const session = require('express-session');
const SessionStore = require('connect-session-knex')(session); // get persistance on restart server by storing in SQLite db
const restricted = require('./restricted-middleware.js');

server.use(helmet());
server.use(express.json());
server.use(cors());

// configure express-session middleware
server.use(
    session({
        name: 'Grand Ape', // default is connect.sid
        secret: 'nobody tosses a dwarf! secret safe and long',
        cookie: {
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day in milliseconds
            secure: false, // only set cookies over https if true. Server will not send back a cookie over http.
        },
        httpOnly: true, // don't let JS code access cookies. Browser extensions run JS code on your browser!
        resave: false,
        saveUninitialized: false,
        // THIS IS TO GET PERSISTANCE:
        store: new SessionStore({
            knex: require('./database/dbConfig'),
            tablename: 'active_sessions',
            sidfieldname: 'sid', // column on table that holds session id
            createtable: true,
            clearInterval: 1000 * 60 * 60
        })        
    })
);


server.get('/', (req, res) => {
    res.send("It's alive!");
});

// Register a new user
// Hash password before saving it to the database
// set user to session.user (so instantly logged in)
server.post('/api/register', (req, res) => {
    let user = req.body;
    let hashedPw = bcrypt.hashSync(user.password, 10);  // 2 ^ 10
    user.password = hashedPw;

    Users.add(user)
        .then(saved => {
            req.session.user = saved; // adding to the req we've been sent
            res.status(201).json(saved);
        })
        .catch(error => {
            res.status(500).json(error);
        });
});


// User login 
// bycrypt compares the hash of the login pass 
// to the hash held on file for that user 
server.post('/api/login', (req, res) => {
    let { username, password } = req.body;

    Users.findBy({ username })
        .first()
        .then(user => {
            if (user && bcrypt.compareSync(password, user.password)) {
                req.session.user = user;

                res.status(200).json({ message: `Welcome ${user.username}, you are logged in!` });
            } else {
                res.status(401).json({ message: 'You shall not pass!' });
            }
        })
        .catch(error => {
            res.status(500).json(error);
        });
});

server.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.end();
})


// if user is logged in, respond with array of users
// restricted middleware checks for req.session.user
server.get('/api/users', restricted, (req, res) => {
    Users.find()
        .then(users => {
            res.json(users);
        })
        .catch(err => res.send(err));
});


const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`\n** Running on port ${port} **\n`));