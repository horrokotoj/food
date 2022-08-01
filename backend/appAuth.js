const authenticate = require('./components/authenticate.js');

require('dotenv').config();
const express = require('express');
const app = express();

const jwt = require('jsonwebtoken');

app.use(express.json());

/*function authenticateToken(req, res, next) {
  console.log('here');
  console.log(req.headers);
  if (req.headers['authorization']) {
    console.log(req.headers['authorization']);
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      console.log('next');
      next();
    });
  } else {
    return res.sendStatus(401);
  }
}*/

app.post('/login', (req, res) => {
  console.log(req.body);
  if (req.body.username) {
    const username = req.body.username;
    const user = { user: username };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
    res.json({ accessToken: accessToken });
  } else {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
});

app.get('/testtoken', authenticate.authenticateToken, (req, res) => {
  console.log(req.body);
  console.log(req.user);
  res.sendStatus(200);
});

app.listen('4000', () => {
  console.log('Server running, listening on port 4000');
});
