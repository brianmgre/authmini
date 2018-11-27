const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./database/dbConfig.js');

const server = express();


function protected(req, res, next) {
    const token = req.headers.authorization;
    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err) {
                //token verification failed
                res.status(401).json({ message: 'invalid token' });
            } else {
                req.decodedToken = decodedToken;
                next();
            }
        });
    } else {
        res.status(401).json({ message: "You're not authorized" });
    }
};


server.use(express.json());
server.use(cors());


server.get('/', (req, res) => {
    res.send('Its Alive!');
});

const jwtSecret = 'hXK2s4RtL2q';

function generateToken(user) {
    const jwtPayload = {
        ...user,
        hello: 'fsw14',
        role: 'admin'
    };
    const jwtOptions = {
        expiresIn: '1m',
    }
    return jwt.sign(jwtPayload, jwtSecret, jwtOptions)
}

server.post('/api/login', (req, res) => {
    const creds = req.body;
    db('users')
        .where({ username: creds.username })
        .first()
        .then(user => {
            if (user && bcrypt.compareSync(creds.password, user.password)) {
                const token = generateToken(user);
                res.status(200).json({ welcome: user.username, token })
            } else {
                res.status(401).json({ message: 'nope' })
            }
        })
        .catch(err => {
            res.status(500).json(err)
        });
});

server.post('/api/register', (req, res) => {
    const creds = req.body;
    const hash = bcrypt.hashSync(creds.password, 14);
    creds.password = hash;
    db('users')
        .insert(creds)
        .then(ids => {
            const id = ids[0];
            res.status(201).json(ids);
        })
        .catch(err =>
            res.status(500).json(err)
        )
});


// protect this route, only authenticated users should see it
server.get('/api/users', protected, (req, res) => {
    db('users')
        .select('id', 'username')
        .then(users => {
            res.json(users);
        })
        .catch(err => res.send(err))
});

server.listen(3300, () => console.log('\nrunning on port 3300\n'));
