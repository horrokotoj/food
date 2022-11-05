# backend

Node js-server for the food app

## Requiements test environment

Requires node version v16.14.2

Requires npm version 8.5.5

`nvm use --lts`

`npm install --save express bcrypt dotenv express jsonwebtoken mysql2 `

## To run server

### Environment

A .env file which contains

`APP_PORT`

`APPAUTH_PORT`

`ACCESS_TOKEN_SECRET`

`REFRESH_TOKEN_SECRET`

Generate a token with:

`node`

`require('crypto').randomBytes(64).toString('hex')`

### For app

`nodemon`

### For authorization server

`nodemon appAuth.js`
