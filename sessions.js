const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);

const db = require('./database/dbConfig.js');

const server = express();

const sessionConfig = {
  secret: 'nobody.tosses.a.dwarf.!', //just for demo this is never put here 
  name: 'monkey', // defauts to connect.sid
  httpOnly: true, //js can't access this
  resave: false,
  saveUninitialized: false, // laws
  cookie: {
    secure: false, //overhttps would be true in real enviroment
    maxAge: 1000 * 60 * 1
  },
  store: new KnexSessionStore({
    tablename: 'sessions',
    sidfieldname: 'sid',
    knex: db,
    createtable: true,
    clearInterval: 1000 * 60 * 60
  })
};

function protected(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(200).json({ message: 'not authorized' })
  }
};

server.use(session(sessionConfig))

server.use(express.json());
server.use(cors());

server.get('/', (req, res) => {
  res.send('Its Alive!');
});

server.post('/api/login', (req, res) => {
  const creds = req.body;
  db('users')
    .where({ username: creds.username })
    .first()
    .then(user => {
      if (user && bcrypt.compareSync(creds.password, user.password)) {
        req.session.userId = user.id
        res.status(200).json({ message: 'welcome' })
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
      req.session.userId  = id;
      res.status(201).json(ids);
    })
    .catch(err =>
      res.status(500).json(err)
    )
});

server.get('/api/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        res.json('you cannot leave');
      } else {
        res.json('Goodbye');
      }
    });
  } else {
    res.end();
  }
});

// protect this route, only authenticated users should see it
server.get('/api/users', protected, (req, res) => {
  console.log(req.session);
  db('users')
    .select('id', 'username')
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err))
});

server.listen(3300, () => console.log('\nrunning on port 3300\n'));
