const authenticate = require('./components/authenticate.js');

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

const port = process.env.APPAUTH_PORT || 4000;

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

app.post('/user', (req, res) => {
  if (req.body.username && req.body.password) {
    const username = req.body.username;
    let sql = `select UserName from Users where
    UserName = "${username}";`;
    db.query(sql, async (err, rows) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log(rows);
        if (rows.length > 0) {
          res.sendStatus(409);
        } else {
          try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            let sql = `insert into Users (UserName, Pass)
              values ("${username}", "${hashedPassword}");`;
            db.query(sql, (err, rows) => {
              if (err) {
                console.log(err);
                res.sendStatus(500);
              } else {
                console.log(rows);
                console.log(rows.affectedRows);
                if (rows.affectedRows === 1) {
                  res.sendStatus(200);
                } else {
                  res.sendStatus(500);
                }
              }
            });
          } catch (err) {
            console.log(err);
          }
        }
      }
    });
  } else {
    res.sendStatus(400);
  }
});

app.post('/login', (req, res) => {
  console.log(req.body);
  if (req.body.username && req.body.password) {
    const username = req.body.username;
    const password = req.body.password;
    console.log(password.length);
    let sql1 = `select Pass from Users
      where UserName = "${username}";`;
    db.query(sql1, async (err, rows) => {
      if (err) {
        res.sendStatus(500);
      } else {
        if (rows.length === 1) {
          const hashedPassword = rows[0].Pass;
          try {
            if (await bcrypt.compare(password, hashedPassword)) {
              const user = { user: username };
              const accessToken = generateAccessToken(user);
              const refreshToken = jwt.sign(
                user,
                process.env.REFRESH_TOKEN_SECRET
              );
              console.log(refreshToken.length);
              let sql2 = `update Users
                set Token = "${refreshToken}"
                where UserName = "${username}";`;

              db.query(sql2, (err, rows) => {
                if (err) {
                  console.log(err);
                  res.sendStatus(500);
                } else {
                  console.log(rows);
                  console.log(rows.affectedRows);
                  if (rows.affectedRows === 1) {
                    res.json({
                      accessToken: accessToken,
                      refreshToken: refreshToken,
                    });
                  } else {
                    res.sendStatus(404);
                  }
                }
              });
            } else {
              res.sendStatus(401);
            }
          } catch (err) {
            console.log(err);
            res.sendStatus(500);
          }
        } else {
          res.sendStatus(401);
        }
      }
    });
  } else {
    res.sendStatus(400);
    return;
  }
});

app.post('/logout', authenticate.authenticateToken, (req, res) => {
  const username = req.user.user;
  let sql = `update Users 
    set Token = NULL
    where UserName = "${username}";`;
  db.query(sql, (err, rows) => {
    if (err) {
      res.sendStatus(500);
    } else {
      console.log('Rows after logout query');
      console.log(rows);
      if (rows.affectedRows === 1) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    }
  });
});

app.post('/token', (req, res) => {
  if (req.body.token) {
    console.log(req.body.token);
    const refreshToken = req.body.token;
    let sql = `select UserName from Users
      where Token = "${refreshToken}";`;

    db.query(sql, (err, rows) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        if (rows.length === 0) {
          console.log(rows);
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

app.listen(port, () => {
  console.log(`Server running, listening on port ${port}`);
});
