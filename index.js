const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Users = require('./users/users-model.js');
const server = express();


server.use(helmet());
server.use(express.json());
server.use(cors());


server.get('/', (req, res) => {
    res.send("It's alive!");
});

// Register a new user
// Hash password before saving it to the database
server.post('/api/register', (req, res) => {
    let user = req.body;
    let hashedPw = bcrypt.hashSync(user.password, 10);  // 2 ^ 10

    user.password = hashedPw;

    Users.add(user)
        .then(saved => {
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
                res.status(200).json({ message: `Welcome ${user.username}!` });
            } else {
                res.status(401).json({ message: 'You shall not pass!' });
            }
        })
        .catch(error => {
            res.status(500).json(error);
        });
});




const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`\n** Running on port ${port} **\n`));