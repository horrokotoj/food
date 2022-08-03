const authenticate = require('./components/authenticate.js');

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');

const app = express();

const jwt = require('jsonwebtoken');

app.use(express.json());

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

// Create connection to database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yRpEH7JM74dtaT',
  database: 'food_dev',
});

// Connect to db
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to db');
});

app.post('/login', (req, res) => {
  console.log(req.body);
  if (req.body.username) {
    const username = req.body.username;
    const user = { user: username };
    const accessToken = generateAccessToken(user);
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
    console.log(refreshToken.length);
    let sql = `update Users
      set Token = "${refreshToken}"
      where UserName = "${username}";`;

    db.query(sql, (err, rows) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log(rows);
        console.log(rows.affectedRows);
        if (rows.affectedRows === 1) {
          res.json({ accessToken: accessToken, refreshToken: refreshToken });
        } else {
          res.sendStatus(404);
        }
      }
    });
  } else {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
});

app.post('/token', (req, res) => {
  if (req.body.token) {
    const refreshToken = req.body.token;
    let sql = `select UserName from Users
      where Token = "${refreshToken}";`;

    db.query(sql, (err, rows) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        if (rows.length === 0) {
          res.sendStatus(404);
        } else if (rows.length === 1) {
          const user = { user: rows[0].UserName };
          const accessToken = generateAccessToken(user);
          res.json({ token: accessToken });
        } else {
          res.sendStatus(500);
        }
      }
    });
  } else {
    res.sendStatus(400);
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
