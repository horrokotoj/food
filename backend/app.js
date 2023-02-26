const authenticate = require('./components/authenticate.js');

require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const port = process.env.APP_PORT || 4000;

app.use(express.json());

function generateAccessToken(user) {
	return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
	return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: '365d',
	});
}

function generateEmailToken(user) {
	return jwt.sign(user, process.env.EMAIL_SECRET, {
		expiresIn: '7d',
	});
}

function handleErrorResponse(err) {
	if (err.code === 'ER_DUP_ENTRY') {
		return 409;
	} else if (
		err.code === 'ER_BAD_FIELD_ERROR' ||
		err.code === 'ER_PARSE_ERROR' ||
		err.code === 'ER_NO_REFERENCED_ROW_2'
	) {
		return 400;
	} else {
		return 500;
	}
}

function handleQuery(sql, res) {
	db.query(sql, (err, rows) => {
		if (err) {
			console.log(err);
			res.sendStatus(handleErrorResponse(err));
		} else {
			console.log(rows);

			res.send(rows);
		}
	});
}

function handleMultiQuery(sqlArr, res) {
	let rowsArr = [];
	for (let i = 0; i < sqlArr.length; i++) {
		db.query(sqlArr[i], (err, rows) => {
			if (err) {
				console.log(err);
				res.sendStatus(handleErrorResponse(err));
			} else {
				console.log(rows);

				rowsArr = rowsArr.concat(rows);
				if (i == sqlArr.length - 1) {
					console.log(rowsArr);
					res.send(rowsArr);
				}
			}
		});
	}
}

// nodemailer
async function verificationMail({ username, email }) {
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: process.env.VER_HOST,
		port: process.env.VER_PORT,
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.VER_EMAIL, // generated ethereal user
			pass: process.env.VER_PASS, // generated ethereal password
		},
		tls: {
			rejectUnauthorized: false,
		},
	});
	console.log('before email token');

	let user = { user: username };
	let emailToken = generateEmailToken(user);
	console.log('generated email token');
	console.log(emailToken);
	let verifyUrl = `http://${process.env.URL}:${process.env.APP_PORT}/verify/${emailToken}`;

	let mailOptions = {
		from: `"food verifier" <${process.env.VER_EMAIL}>`, // sender address
		to: email, // list of receivers
		subject: 'food verification request', // Subject line
		text: `Hello!`, // plain text body
		html: `<html>
							<body>
								<h1>Verify your account with food</h1>
								<p>
									You are reciving this email since you registered for an account with food.
								</p>
								<p>Please verify your account to be able to log in.</p>
								<a href="${verifyUrl}"
									>Verify</a
								>
							</body>
						</html>`, // html body
	};

	// send mail with defined transport object
	await transporter.sendMail(mailOptions, (error, info, res) => {
		if (error) {
			console.log(error);
		} else {
			console.log(`Message sent: ${info.messageId}`);
		}
	});
}

// Create connection to database
const db = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

// Auth

app.post('/user', (req, res) => {
	if (req.body.username && req.body.password && req.body.email) {
		const username = req.body.username;
		const email = req.body.email.toLowerCase();
		let sql = `select UserName, UserEmail, Verified from Users where
    UserName = "${username}" or UserEmail = "${email}";`;
		db.query(sql, async (err, rows) => {
			if (err) {
				console.log(err);
				res.sendStatus(500);
			} else {
				console.log(rows);
				if (rows.length == 1) {
					if (rows[0].Verified) {
						res.sendStatus(409);
					} else {
						if (username == rows[0].UserName && email == rows[0].UserEmail) {
							const newHashedPassword = await bcrypt.hash(
								req.body.password,
								10
							);
							let sql = `update Users
								set Pass = "${newHashedPassword}" 
								where UserName = "${username}" or UserEmail = "${email}";`;
							db.query(sql, (err, rows) => {
								if (err) {
									console.log(err);
									res.sendStatus(500);
								} else {
									console.log(rows);
									console.log(rows.affectedRows);
									if (rows.affectedRows === 1) {
										verificationMail({ username: username, email: email });
										res.sendStatus(200);
									} else {
										res.sendStatus(500);
									}
								}
							});
						} else {
							res.sendStatus(409);
						}
					}
				} else if (rows.length > 1) {
					res.sendStatus(500);
				} else {
					try {
						const hashedPassword = await bcrypt.hash(req.body.password, 10);
						let sql = `insert into Users (UserName, Pass, UserEmail)
              values ("${username}", "${hashedPassword}", "${email}");`;
						db.query(sql, (err, rows) => {
							if (err) {
								console.log(err);
								res.sendStatus(500);
							} else {
								console.log(rows);
								console.log(rows.affectedRows);
								if (rows.affectedRows === 1) {
									verificationMail({ username: username, email: email });
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
		let sql1 = `select UserEmail, Pass, Verified, HouseHoldId from Users
      where UserName = "${username}";`;
		db.query(sql1, async (err, rows) => {
			if (err) {
				res.sendStatus(500);
			} else {
				if (rows.length === 1) {
					if (rows[0].Verified) {
						const hashedPassword = rows[0].Pass;
						const email = rows[0].UserEmail;
						const houseHoldId = rows[0].HouseHoldId;
						try {
							if (await bcrypt.compare(password, hashedPassword)) {
								const user = {
									user: username,
									email: email,
									houseHoldId: houseHoldId,
								};
								const accessToken = generateAccessToken(user);
								const refreshToken = generateRefreshToken(user);
								let sql2 = `update Users
														set Token = "${refreshToken}"
														where UserName = "${username}";`;
								db.query(sql2, (err, rows) => {
									if (err) {
										console.log(err);
										console.log('Unable to update Token');
										res.sendStatus(500);
									} else {
										if (rows.affectedRows === 1) {
											console.log('Successfully updated Token');
											res.json({
												accessToken: accessToken,
												refreshToken: refreshToken,
												user: user,
											});
										} else {
											res.sendStatus(500);
											console.log('Unable to update Token');
										}
									}
								});
							} else {
								res.sendStatus(401);
								console.log('Invalid password');
							}
						} catch (err) {
							console.log(err);
							res.sendStatus(500);
						}
					} else {
						res.sendStatus(401);
					}
				} else {
					res.sendStatus(401);
					console.log('Invalid username');
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
			if (rows.affectedRows === 1) {
				res.sendStatus(200);
			} else {
				res.sendStatus(500);
			}
		}
	});
});

app.post('/token', authenticate.authenticateRefreshToken, (req, res) => {
	const username = req.user.user;
	const authHeader = req.headers['authorization'];
	const token = authHeader.split(' ')[1];
	let sql = `select Token from Users where UserName = "${username}"`;
	db.query(sql, (err, rows) => {
		if (err) {
			console.log(err);
			res.sendStatus(500);
		} else if (rows.length === 1 && rows[0].Token === token) {
			const user = { user: username };
			const accessToken = generateAccessToken(user);
			if (accessToken) {
				console.log('New accessToken');
				console.log(accessToken);
				res.json({ token: accessToken });
			}
		} else {
			res.sendStatus(500);
		}
	});
});

app.get('/verify/:id', (req, res) => {
	const token = req.params.id;
	jwt.verify(token, process.env.EMAIL_SECRET, (err, user) => {
		if (err) {
			console.log('Failed');
			res.writeHead(200, { 'Content-Type': 'text/html' });
			html = fs.readFileSync('./responseFailure.html');
			res.end(html);
		} else {
			console.log(user);
			let sql = `select Verified from Users where UserName = "${user.user}";`;
			db.query(sql, async (err, rows) => {
				if (err) {
					console.log(error);
					res.sendStatus(500);
				} else {
					console.log(rows);
					if (rows.length == 1) {
						if (rows[0].Verified) {
							res.writeHead(200, { 'Content-Type': 'text/html' });
							html = fs.readFileSync('./responseDone.html');
							res.end(html);
						} else {
							let sql2 = `update Users
														set Verified = true where UserName = "${user.user}";`;
							db.query(sql2, (err, rows) => {
								if (err) {
									console.log(error);
									res.sendStatus(500);
								} else {
									if (rows.affectedRows === 1) {
										res.writeHead(200, { 'Content-Type': 'text/html' });
										html = fs.readFileSync('./responseSuccess.html');
										res.end(html);
									} else {
										res.sendStatus(500);
									}
								}
							});
						}
					} else {
						res.sendStatus(500);
					}
				}
			});
		}
	});
});

app.get('/testtoken', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	console.log(req.user);
	res.sendStatus(200);
});

// get requests

//users

app.get('/users', authenticate.authenticateToken, (req, res) => {
	console.log(req.user);
	let sql = `select UserName from Users;`;
	handleQuery(sql, res);
});

//recipes

app.get('/recipes', authenticate.authenticateToken, (req, res) => {
	console.log(req.user);

	let sql = `select distinct Recipes.RecipeId, 
							Recipes.RecipeName, 
							Recipes.RecipeDesc, 
							Recipes.RecipeImage,  
							Recipes.RecipePortions,  
							Recipes.Public,
							Recipes.RegisterDate as RegisterDate, 
							Users.UserName as RecipeOwner, 
							Users.HouseHoldId as HouseHoldId 
						from Recipes left join 
							Users on Recipes.RecipeOwner = Users.UserId join 
							InHouseHold left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
						where 
							Recipes.Public = true
						or
							(Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
						or 
							Users.UserName = "${req.user.user}";`;
	handleQuery(sql, res);
});

app.get('/recipe/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, Recipes.RegisterDate as RegisterDate 
    from Recipes
    left join Users on Recipes.RecipeOwner = Users.UserId
    where RecipeId = ${req.params.id};`;
	handleQuery(sql, res);
});

// ingredients

app.get('/ingredients', authenticate.authenticateToken, (req, res) => {
	let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement 
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId`;
	handleQuery(sql, res);
});

app.get('/ingredient/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId
  where IngredientId = ${req.params.id};`;
	handleQuery(sql, res);
});

//recipeingredients

app.get('/recipeingredient/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select Ingredients.IngredientId, IngredientName, Quantity, MeasurementName 
  from RecipeIngredients 
  left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId 
  where RecipeId = ${req.params.id};`;
	handleQuery(sql, res);
});

//recipeSteps

app.get('/recipesteps/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select StepId, Step, StepDesc 
  from Steps 
  where RecipeId = ${req.params.id};`;
	handleQuery(sql, res);
});

// measurements

app.get('/measurements', authenticate.authenticateToken, (req, res) => {
	let sql = 'select * from Measurements';
	handleQuery(sql, res);
});

// storesections

app.get('/storesections', authenticate.authenticateToken, (req, res) => {
	let sql = 'select * from StoreSections';
	handleQuery(sql, res);
});

// recipecalendar

app.get('/recipecalendar', authenticate.authenticateToken, (req, res) => {
	let sql = `select distinct RecipeCalendar.RecipeCalendarId, 
							RecipeCalendar.RecipeId, 
							Users.UserName as IssuedUser, 
							RecipeCalendar.RecipeDate as RecipeDate, 
							RecipeCalendar.Portions, 
							Recipes.RecipeName, 
							Recipes.RecipeDesc, 
							Recipes.RecipeImage
						from RecipeCalendar left join 
							Users on RecipeCalendar.UserId = Users.UserId 
							join InHouseHold 
							left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
							left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
						where 
							(Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
						or 
							Users.UserName = "${req.user.user}";`;
	handleQuery(sql, res);
});

app.get(
	'/recipecalendar/:year/:month/:day',
	authenticate.authenticateToken,
	(req, res) => {
		let sql = `select RecipeCalendarId, RecipeDate as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate = "${req.params.year}-${req.params.month}-${req.params.day}"`;
		handleQuery(sql, res);
	}
);

app.get(
	'/recipecalendar/intervall/',
	authenticate.authenticateToken,
	(req, res) => {
		if (req.body.startDate && req.body.endDate) {
			let sql = `
			select distinct RecipeCalendar.RecipeCalendarId, Users.UserName as IssuedUser, Users.UserId, RecipeCalendar.RecipeDate as RecipeDate, RecipeCalendar.RecipeId, RecipeCalendar.Portions
	from RecipeCalendar left join 
	Users on RecipeCalendar.UserId = Users.UserId 
	join InHouseHold 
	left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
	left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
	where 
	((Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
	or 
	Users.UserName = "${req.user.user}") and 
	(RecipeCalendar.RecipeDate between "${req.body.startDate}" and "${req.body.endDate}");
			`;
			handleQuery(sql, res);
		} else {
			res.sendStatus(400);
		}
	}
);

// shoppinglists

app.get('/shoppinglists', authenticate.authenticateToken, (req, res) => {
	let sql = `select distinct ShoppingLists.ShoppingListId, ShoppingLists.ShoppingListName, ShoppingLists.StartDate, ShoppingLists.EndDate, Users.UserName as IssuedUser, ShoppingLists.StoreId from ShoppingLists 
	left join Users on ShoppingLists.UserId = Users.UserId
	join InHouseHold
	left join Users as Users2 on InHouseHold.UserId = Users2.UserId
	where (Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
	or
	Users.UserName = "${req.user.user}";`;
	handleQuery(sql, res);
});

app.get(
	'/shoppinglist/intervall/',
	authenticate.authenticateToken,
	(req, res) => {
		if (req.body.startDate && req.body.endDate) {
			let sql = `select 
			Ingredients.IngredientId, Ingredients.IngredientName, sum((RecipeCalendar.CalendarPortions/RecipeCalendar.RecipePortions*RecipeIngredients.Quantity)) as FinalQuantity
			from (
			select distinct RecipeCalendar.RecipeCalendarId, 
			Users.UserName as IssuedUser, 
			Users.UserId, RecipeCalendar.RecipeDate as RecipeDate, 
			RecipeCalendar.RecipeId, 
			RecipeCalendar.Portions as CalendarPortions, 
			Recipes.RecipePortions as RecipePortions
				from RecipeCalendar left join 
				Users on RecipeCalendar.UserId = Users.UserId 
				join InHouseHold 
				left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
				left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
				where 
				((Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
				or 
				Users.UserName = "${req.user.user}") and 
				(RecipeCalendar.RecipeDate between "${req.body.startDate}" and "${req.body.endDate}")
			) as RecipeCalendar
			left join RecipeIngredients on RecipeCalendar.RecipeId = RecipeIngredients.RecipeId
			left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
			group by Ingredients.IngredientName;`;

			handleQuery(sql, res);
		} else {
			res.sendStatus(400);
		}
	}
);

// listcontents

app.get('/listcontents', authenticate.authenticateToken, (req, res) => {
	let sql = `select * from ListContents;`;
	handleQuery(sql, res);
});

app.get('/listcontent/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select * from ListContents
    where ShoppingListId = ${req.params.id};`;
	handleQuery(sql, res);
});

app.get('/household', authenticate.authenticateToken, (req, res) => {
	let user = req.user;
	let sql = `select  from ListContents
    where ShoppingListId = ${req.params.id};`;
	handleQuery(sql, res);
});

// post requests

// recipes

app.post('/recipe', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql = `insert into Recipes (RecipeName, 
    RecipeDesc, 
    RecipeImage, 
    RecipePortions, 
    RecipeOwner, 
    RegisterDate)
  values 
    ("${req.body.RecipeName}", 
    "${req.body.RecipeDesc}",
    "${req.body.RecipeImage}", 
    ${req.body.RecipePortions}, 
    ${req.body.RecipeOwner},
    curdate());`;

	handleQuery(sql, res);
});

app.post('/entirerecipe', authenticate.authenticateToken, (req, res) => {
	console.log(req.user);
	let sql = `select UserId from Users where UserName = "${req.user.user}";`;
	let UserId = null;
	let RecipeId = null;
	let sqlArray = [];
	let partialResult;
	db.query(sql, (err, rows) => {
		if (err) {
			console.log(err);
			res.sendStatus(handleErrorResponse(err));
		} else {
			console.log('Finding user done');
			if (rows.length > 1) {
				res.sendStatus(409);
			} else {
				UserId = rows[0].UserId;
				if (UserId) {
					let sql1 = `insert into Recipes (RecipeName, 
						RecipeDesc, 
						RecipeImage, 
						RecipePortions, 
						RecipeOwner, 
						RegisterDate)
					values 
						("${req.body.RecipeName}", 
						"${req.body.RecipeDesc}",
						"${req.body.RecipeImage}", 
						${req.body.RecipePortions}, 
						${UserId},
						curdate());`;
					db.query(sql1, (err, rows) => {
						if (err) {
							console.log(err);
							res.sendStatus(handleErrorResponse(err));
						} else {
							partialResult = rows;
							RecipeId = rows.insertId;
							if (RecipeId) {
								for (let i = 0; i < req.body.RecipeIngredients.length; i++) {
									sql = `insert into RecipeIngredients (RecipeId, IngredientId, Quantity)
										values 
											(${RecipeId}, 
											${req.body.RecipeIngredients[i].IngredientId}, 
											${req.body.RecipeIngredients[i].Quantity});`;
									sqlArray = sqlArray.concat(sql);
								}
								for (let i = 0; i < req.body.RecipeSteps.length; i++) {
									sql = `insert into Steps (Step, RecipeId, StepDesc)
										values 
											(${req.body.RecipeSteps[i].Step}, 
											${RecipeId}, 
											"${req.body.RecipeSteps[i].StepDesc}");`;
									sqlArray = sqlArray.concat(sql);
								}
								if (sqlArray.length > 0) {
									handleMultiQuery(sqlArray, res);
								} else {
									res.send(partialResult);
								}
							}
						}
					});
				} else {
					console.log('No UserId');
					res.sendStatus(400);
				}
			}
		}
	});

	console.log(UserId);
	console.log(req.body);
	//res.sendStatus(400);
});

// ingredients

app.post('/ingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql = `insert into Ingredients (IngredientName, 
    MeasurementId, StoreSectionId)
  values 
    ("${req.body.IngredientName}", 
    ${req.body.MeasurementId}, 
		${req.body.StoreSectionId});`;

	handleQuery(sql, res);
});

// recipeingredients

app.post('/recipeingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql = `insert into RecipeIngredients (RecipeId, IngredientId, Quantity)
  values 
    (${req.body.RecipeId}, 
    ${req.body.IngredientId}, 
    ${req.body.Quantity});`;

	handleQuery(sql, res);
});

//recipeSteps

app.post('/recipestep', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql = `insert into Steps (Step, RecipeId, StepDesc)
  values 
    (${req.body.Step}, 
    ${req.body.RecipeId}, 
    "${req.body.StepDesc}");`;

	handleQuery(sql, res);
});

// measurements

app.post('/measurement', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql = `insert into Measurements (MeasurementName)
  values 
    (${req.body.MeasurementName};`;

	handleQuery(sql, res);
});

// recipecalendar

app.post('/recipecalendar', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);

	if (req.body.RecipeDate && req.body.RecipeId && req.body.Portions) {
		let sqlName = `select UserId from Users where UserName = "${req.user.user}";`;
		db.query(sqlName, (err, rows) => {
			if (err) {
				console.log(err);
				res.sendStatus(handleErrorResponse(err));
			} else {
				console.log(rows);
				if (rows.length === 1) {
					let UserId = rows[0].UserId;
					let sql = `insert into RecipeCalendar (UserId, RecipeDate, RecipeId, Portions)
						values 
							(${UserId},
							"${req.body.RecipeDate}",
							${req.body.RecipeId},
							${req.body.Portions});`;
					handleQuery(sql, res);
				} else {
					res.sendStatus(500);
				}
			}
		});
	} else {
		res.sendStatus(400);
	}
});

// shoppinglists

app.post('/shoppinglist', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sqlUserId = `select Users.UserId, HouseHolds.DefaultStore from Users left join HouseHolds on Users.HouseHoldId = HouseHolds.HouseHoldId where UserName = "${req.user.user}";`;
	db.query(sqlUserId, (err, rows) => {
		if (err) {
			console.log(err);
			res.sendStatus(500);
		} else {
			//
			if (rows.length === 1) {
				let UserId = rows[0].UserId;
				let StoreId = rows[0].DefaultStore;
				let sql;
				if (req.body.ShoppingListName) {
					if (req.body.StartDate && req.body.EndDate) {
						sql = `insert into ShoppingLists (ShoppingListName, StartDate, EndDate, UserId, StoreId)
								values 
								("${req.body.ShoppingListName}",
								"${req.body.StartDate}",
								"${req.body.EndDate}",
								${UserId}, 
								${StoreId});`;
					} else {
						sql = `insert into ShoppingLists (ShoppingListName, UserId, StoreId)
								values 
								("${req.body.ShoppingListName}, ${UserId}, ${StoreId}");`;
					}
				} else if (req.body.StartDate && req.body.EndDate) {
					sql = `insert into ShoppingLists (StartDate, EndDate, UserId, StoreId)
							values 
							("${req.body.StartDate}",
							"${req.body.EndDate},
							${UserId}, 
							${StoreId}");`;
				} else {
					res.sendStatus(400);
				}
				handleQuery(sql, res);
			}
		}
	});
});

// listcontents

app.post('/listcontent', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql;
	if (
		req.body.ShoppingListId &&
		req.body.IngredientId &&
		req.body.Quantity &&
		req.body.MeasurementName
	) {
		sql = `select Quantity from ListContents where ShoppingListId = ${req.body.ShoppingListId} and IngredientId = ${req.body.IngredientId};`;
		db.query(sql, (err, rows) => {
			if (err) {
				console.log(err);
				res.sendStatus(handleErrorResponse(err));
			} else {
				console.log(rows);
				if (rows.length === 1) {
					sql = `update ListContents 
            set Quantity = (${rows[0].Quantity} + ${req.body.Quantity})
            where ShoppingListId = ${req.body.ShoppingListId} and IngredientId = ${req.body.IngredientId}`;
					handleQuery(sql, res);
				} else {
					if (req.body.StoreId) {
						sql = `insert into ListContents 
						(ShoppingListId, 
							IngredientId, 
							Indexx, 
							IngredientName, 
							Quantity, 
							MeasurementName)
							values 
							(${req.body.ShoppingListId}, 
							${req.body.IngredientId}, 
							(select SectionOrder.OrderOfSection from Ingredients left join SectionOrder on Ingredients.StoreSectionId = SectionOrder.StoresectionId where Ingredients.IngredientId = ${req.body.IngredientId} and SectionOrder.StoreId = ${req.body.StoreId}),
							(select IngredientName from Ingredients where IngredientId = ${req.body.IngredientId}), 
							${req.body.Quantity}, 
							"${req.body.MeasurementName}");`;
					} else {
						sql = `insert into ListContents 
						(ShoppingListId, 
							IngredientId, 
							Indexx, 
							IngredientName, 
							Quantity, 
							MeasurementName)
							values 
							(${req.body.ShoppingListId}, 
							${req.body.IngredientId}, 
							0,
							(select IngredientName from Ingredients where IngredientId = ${req.body.IngredientId}), 
							${req.body.Quantity}, 
							"${req.body.MeasurementName}");`;
					}

					handleQuery(sql, res);
				}
			}
		});
	} else {
		res.sendStatus(400);
	}
});

app.post(
	'/shoppinglist/intervall',
	authenticate.authenticateToken,
	(req, res) => {
		console.log(req.body);
		if (req.body.startDate && req.body.endDate) {
			let sqlUserId = `select Users.UserId, HouseHolds.DefaultStore from Users left join HouseHolds on Users.HouseHoldId = HouseHolds.HouseHoldId where UserName = "${req.user.user}";`;
			db.query(sqlUserId, (err, rows) => {
				if (err) {
					console.log(err);
					res.sendStatus(500);
				} else {
					if (rows.length === 1) {
						let UserId = rows[0].UserId;
						let StoreId = rows[0].DefaultStore;
						let sqlList = `insert into ShoppingLists (ShoppingListName, StartDate, EndDate, UserId, StoreId)
							values
							("${req.body.startDate} - ${req.body.endDate}", "${req.body.startDate}", "${req.body.endDate}", ${UserId}, ${StoreId});`;
						db.query(sqlList, (err, rows) => {
							if (err) {
								console.log(err);
								res.sendStatus(500);
							} else {
								let ShoppingListId = rows.insertId;
								let sql;
								if (StoreId) {
									sql = `insert into ListContents (ShoppingListId, IngredientId, IngredientName, Quantity, MeasurementName, Indexx)
													(select
													ShoppingLists.ShoppingListId,
													Ingredients.IngredientId,
													Ingredients.IngredientName,
													sum((RecipeCalendar.CalendarPortions/RecipeCalendar.RecipePortions*RecipeIngredients.Quantity)) as Quantity,
													Measurements.MeasurementName,
													SectionOrder.OrderOfSection
													from (
													select distinct RecipeCalendar.RecipeCalendarId,
													Users.UserName as IssuedUser,
													Users.UserId, RecipeCalendar.RecipeDate as RecipeDate,
													RecipeCalendar.RecipeId,
													RecipeCalendar.Portions as CalendarPortions,
													Recipes.RecipePortions as RecipePortions
													from RecipeCalendar left join
													Users on RecipeCalendar.UserId = Users.UserId
													join InHouseHold
													left join Users as Users2 on InHouseHold.UserId = Users2.UserId
													left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
													where
													((Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
													or
													Users.UserName = "${req.user.user}") and
													(RecipeCalendar.RecipeDate between "${req.body.startDate}" and "${req.body.endDate}")
													) as RecipeCalendar
													left join RecipeIngredients on RecipeCalendar.RecipeId = RecipeIngredients.RecipeId
													left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId
													left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId
													left join SectionOrder on Ingredients.StoreSectionId = SectionOrder.StoreSectionId
													left join ShoppingLists on ShoppingLists.ShoppingListId = ${ShoppingListId}
													where SectionOrder.StoreId = ${StoreId}
													group by Ingredients.IngredientName);`;
								} else {
									sql = `insert into ListContents (ShoppingListId, IngredientId, IngredientName, Quantity)
													(
													select
													ShoppingLists.ShoppingListId, Ingredients.IngredientId, Ingredients.IngredientName, sum((RecipeCalendar.CalendarPortions/RecipeCalendar.RecipePortions*RecipeIngredients.Quantity)) as Quantity
													from (
													select distinct RecipeCalendar.RecipeCalendarId,
													Users.UserName as IssuedUser,
													Users.UserId, RecipeCalendar.RecipeDate as RecipeDate,
													RecipeCalendar.RecipeId,
													RecipeCalendar.Portions as CalendarPortions,
													Recipes.RecipePortions as RecipePortions
														from RecipeCalendar left join
														Users on RecipeCalendar.UserId = Users.UserId
														join InHouseHold
														left join Users as Users2 on InHouseHold.UserId = Users2.UserId
														left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
														where
														((Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
														or
														Users.UserName = "${req.user.user}") and
														(RecipeCalendar.RecipeDate between "${req.body.startDate}" and "${req.body.startDate}")
													) as RecipeCalendar
													left join RecipeIngredients on RecipeCalendar.RecipeId = RecipeIngredients.RecipeId
													left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId
													left join ShoppingLists on ShoppingLists.ShoppingListId = ${ShoppingListId}
													group by Ingredients.IngredientName
													);`;
								}
								handleQuery(sql, res);
							}
						});
					} else {
						console.log(rows);
						res.sendStatus(500);
					}
				}
			});
		} else {
			res.sendStatus(400);
		}
	}
);

app.post(
	'/listcontents/intervall/ordered',
	authenticate.authenticateToken,
	(req, res) => {
		console.log(req.body);
		if (
			req.body.ShoppingListId &&
			req.body.startDate &&
			req.body.startDate &&
			req.body.StoreId
		) {
			let sql = `insert into ListContents (ShoppingListId, IngredientId, IngredientName, Quantity, Indexx)
			(
				select 
				ShoppingLists.ShoppingListId, 
				Ingredients.IngredientId, 
				Ingredients.IngredientName, 
				sum((RecipeCalendar.CalendarPortions/RecipeCalendar.RecipePortions*RecipeIngredients.Quantity)) as Quantity,
				SectionOrder.OrderOfSection
				from (
				select distinct RecipeCalendar.RecipeCalendarId, 
				Users.UserName as IssuedUser, 
				Users.UserId, RecipeCalendar.RecipeDate as RecipeDate, 
				RecipeCalendar.RecipeId, 
				RecipeCalendar.Portions as CalendarPortions, 
				Recipes.RecipePortions as RecipePortions
				from RecipeCalendar left join 
				Users on RecipeCalendar.UserId = Users.UserId 
				join InHouseHold 
				left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
				left join Recipes on RecipeCalendar.RecipeId = Recipes.RecipeId
				where 
				((Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${rew.user.user}")
				or 
				Users.UserName = "${rew.user.user}") and 
				(RecipeCalendar.RecipeDate between "${req.body.startdate}" and "${req.body.endDate}")
				) as RecipeCalendar
				left join RecipeIngredients on RecipeCalendar.RecipeId = RecipeIngredients.RecipeId
				left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
				left join SectionOrder on Ingredients.StoreSectionId = SectionOrder.StoreSectionId
				left join ShoppingLists on ShoppingLists.ShoppingListId = ${req.body.ShoppingListId}
				where SectionOrder.StoreId = ${req.body.StoreId}
				group by Ingredients.IngredientName
				);`;

			handleQuery(sql, res);
		} else {
			res.sendStatus(400);
		}
	}
);

// delete requests

// recipes

app.delete('/recipe', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeId) {
		if (req.body.value) {
			let sql = `update Recipes
        set ${req.body.value} = ''
        where RecipeId = ${req.body.RecipeId}`;
			handleQuery(sql, res);
		} else {
			let sql1 = `delete from RecipeIngredients where RecipeId = ${req.body.RecipeId};`;

			let sql2 = `delete from Recipes where RecipeId = ${req.body.RecipeId};`;

			handleMultiQuery([sql1, sql2], res);
		}
	} else {
		res.sendStatus(400);
	}
});

// ingredients

app.delete('/ingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.IngredientId) {
		let sql1 = `delete from RecipeIngredients where IngredientId = ${req.body.IngredientId};`;

		let sql2 = `delete from Ingredients where IngredientId = ${req.body.IngredientId};`;

		handleMultiQuery([sql1, sql2], res);
	} else {
		res.sendStatus(400);
	}
});

// recipeingredients

app.delete('/recipeingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeId && req.body.IngredientId) {
		let sql = `delete from 
      RecipeIngredients where 
        RecipeId = ${req.body.RecipeId}
        and
        IngredientId = ${req.body.IngredientId};`;

		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

//recipeSteps

app.delete('/recipestep', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.StepId) {
		let sql = `delete from 
      Steps where 
      StepId = ${req.body.StepId}`;

		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

// measurements

app.delete('/measurement', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.MeasurementId) {
		let sql1 = `delete from RecipeIngredients where IngredientId in (select IngredientId from Ingredients where MeasurementId = ${req.body.MeasurementId});`;

		let sql2 = `delete from Ingredients where MeasurementId  = ${req.body.MeasurementId};`;

		let sql3 = `delete from 
      Measurements where 
      MeasurementId = ${req.body.MeasurementId};`;
		handleMultiQuery([sql1, sql2, sql3], res);
	} else {
		res.sendStatus(400);
	}
});

// recipecalendar

app.delete('/recipecalendar', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeCalendarId) {
		let sql = `delete from RecipeCalendar 
      where RecipeCalendarId = ${req.body.RecipeCalendarId};`;
		handleQuery(sql, res);
	} else if (req.body.RecipeDate) {
		let sql = `delete from RecipeCalendar 
    where RecipeDate = "${req.body.RecipeDate}";`;
		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

app.delete(
	'/recipecalendar/intervall',
	authenticate.authenticateToken,
	(req, res) => {
		console.log(req.body);
		if (req.body.StartDate && req.body.EndDate) {
			let sql = `delete from RecipeCalendar 
      where RecipeDate between "${req.body.StartDate}" and "${req.body.EndDate}";`;
			handleQuery(sql, res);
		} else {
			res.sendStatus(400);
		}
	}
);

// shoppinglists

app.delete('/shoppinglist', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.ShoppingListId) {
		let sql1 = `delete from ListContents where ShoppingListId = ${req.body.ShoppingListId};`;
		let sql2 = `delete from ShoppingLists where ShoppingListId = ${req.body.ShoppingListId};`;
		handleMultiQuery([sql1, sql2], res);
	} else if (req.body.ShoppingListName) {
		let sql1 = `delete from ListContents 
      where 
      ShoppingListId = (
        select ShoppingListId from ShoppingLists 
        where ShoppingListName = "${req.body.ShoppingListName}");`;
		let sql2 = `delete from ShoppingLists 
    where 
    ShoppingListName = "${req.body.ShoppingListName}";`;
		handleMultiQuery([sql1, sql2], res);
	} else {
		res.sendStatus(400);
	}
});

// listcontents

app.delete('/listcontent', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.ShoppingListId && req.body.IngredientId) {
		let sql = `delete from ListContents 
      where ShoppingListId = ${req.body.ShoppingListId} 
      and IngredientId = ${req.body.IngredientId};`;
		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

// patch requests

// users

app.patch('/user', authenticate.authenticateToken, async (req, res) => {
	let updates = '';
	if (req.body.Pass) {
		const newHashedPassword = await bcrypt.hash(req.body.Pass, 10);
		updates = updates.concat(` Pass = "${newHashedPassword}",`);
	}
	if (req.body.HouseHold) {
		updates = updates.concat(` HouseHold = ${req.body.HouseHold},`);
	}
	console.log(updates);
	if (updates === '') {
		res.sendStatus(400);
	} else {
		const newUpdates = updates.slice(0, updates.length - 1);
		let sql = `update Users
        set ${newUpdates}
        where Username = "${req.user.user}";`;
		console.log(sql);
		handleQuery(sql, res);
	}
});

// recipes

app.patch('/recipe', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeId) {
		let validateSql = `select distinct Recipes.RecipeId
		from Recipes left join 
			Users on Recipes.RecipeOwner = Users.UserId join 
			InHouseHold left join Users as Users2 on InHouseHold.UserId = Users2.UserId 
		where
			Recipes.RecipeId = ${req.body.RecipeId}
		and
			(Recipes.Public = true
		or
			(Users.HouseHoldId = Users2.HouseHoldId and Users2.UserName = "${req.user.user}")
		or 
			Users.UserName = "${req.user.user}");`;
		db.query(validateSql, (err, rows) => {
			if (err) {
				console.log(err);
				res.sendStatus(handleErrorResponse(err));
			} else {
				console.log('here');
				console.log(rows);
				if (rows.length > 0 && rows[0].RecipeId == req.body.RecipeId) {
					let updates = '';
					if (req.body.RecipeName) {
						updates = updates.concat(` RecipeName = "${req.body.RecipeName}",`);
					}
					if (req.body.RecipeDesc) {
						console.log('here');
						updates = updates.concat(` RecipeDesc = "${req.body.RecipeDesc}",`);
					}
					if (req.body.RecipeSteps) {
						updates = updates.concat(
							` RecipeSteps = "${req.body.RecipeSteps}",`
						);
					}
					if (req.body.RecipeImage) {
						updates = updates.concat(
							` RecipeImage = "${req.body.RecipeImage}",`
						);
					}
					if (req.body.RecipePortions) {
						updates = updates.concat(
							` RecipePortions = ${req.body.RecipePortions},`
						);
					}
					if (req.body.RecipeOwner) {
						updates = updates.concat(
							` RecipeOwner = "${req.body.RecipeOwner}",`
						);
					}
					if (req.body.RegisterDate) {
						updates = updates.concat(
							` RegisterDate = "${req.body.RegisterDate}",`
						);
					}
					if (req.body.Public === true || req.body.Public === false) {
						updates = updates.concat(` Public = ${req.body.Public},`);
					}
					console.log(updates);
					if (updates === '') {
						res.sendStatus(400);
					} else {
						const newUpdates = updates.slice(0, updates.length - 1);
						let sql = `update Recipes
							set ${newUpdates}
							where RecipeId = ${req.body.RecipeId};`;
						console.log(sql);
						handleQuery(sql, res);
					}
				} else {
					res.sendStatus(401);
				}
			}
		});
	} else {
		res.sendStatus(400);
	}
});

// ingredients

app.patch('/ingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.IngredientId) {
		let updates = '';
		if (req.body.IngredientName) {
			updates = updates.concat(
				` IngredientName = "${req.body.IngredientName}",`
			);
		}
		if (req.body.MeasurementId) {
			updates = updates.concat(` MeasurementId = ${req.body.MeasurementId},`);
		}
		if (req.body.StoreSectionId) {
			updates = updates.concat(` StoreSectionId = ${req.body.StoreSectionId},`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update Ingredients
      set ${newUpdates}
      where IngredientId = ${req.body.IngredientId};`;
			handleQuery(sql, res);
		}
	} else {
		res.sendStatus(400);
	}
});

// recipeingredients

app.patch('/recipeingredient', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeId && req.body.IngredientId && req.body.Quantity) {
		let sql = `update RecipeIngredients
                set Quantity = ${req.body.Quantity}
                where RecipeId = ${req.body.RecipeId}
                and IngredientId = ${req.body.IngredientId};`;
		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

//recipeSteps

app.patch('/recipestep', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.StepId) {
		let updates = '';
		if (req.body.Step) {
			updates = updates.concat(` Step = "${req.body.Step}",`);
		}
		if (req.body.StepDesc) {
			updates = updates.concat(` StepDesc = "${req.body.StepDesc}",`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update Steps
      set ${newUpdates}
      where StepId = ${req.body.StepId};`;
			handleQuery(sql, res);
		}
	} else {
		res.sendStatus(400);
	}
});

// measurements

app.patch('/measurement', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.MeasurementId && req.body.MeasurementName) {
		let sql = `update Measurements
                set MeasurementName = "${req.body.MeasurementName}"
                where MeasurementId = ${req.body.MeasurementId};`;
		handleQuery(sql, res);
	} else {
		res.sendStatus(400);
	}
});

// recipecalendar

app.patch('/recipecalendar', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.RecipeCalendarId) {
		let updates = '';
		if (req.body.RecipeDate) {
			updates = updates.concat(` RecipeDate = "${req.body.RecipeDate}",`);
		}
		if (req.body.RecipeId) {
			updates = updates.concat(` RecipeId = ${req.body.RecipeId},`);
		}
		if (req.body.Portions) {
			updates = updates.concat(` Portions = ${req.body.Portions},`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update RecipeCalendar
      set ${newUpdates}
      where RecipeCalendarId = ${req.body.RecipeCalendarId};`;
			handleQuery(sql, res);
		}
	} else {
		res.sendStatus(400);
	}
});

// shoppinglists

app.patch('/shoppinglist', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.ShoppingListId) {
		let updates = '';
		if (req.body.ShoppingListName) {
			updates = updates.concat(
				` ShoppingListName = "${req.body.ShoppingListName}",`
			);
		}
		if (req.body.StartDate) {
			updates = updates.concat(` StartDate = "${req.body.StartDate}",`);
		}
		if (req.body.EndDate) {
			updates = updates.concat(` EndDate = "${req.body.EndDate}",`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update ShoppingLists
      set ${newUpdates}
      where ShoppingListId = ${req.body.ShoppingListId};`;
			handleQuery(sql, res);
		}
	} else {
		res.sendStatus(400);
	}
});

// listcontents

app.patch('/listcontent', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	if (req.body.ShoppingListId && req.body.IngredientId) {
		let updates = '';
		if (req.body.IngredientName) {
			updates = updates.concat(
				` IngredientName = "${req.body.IngredientName}",`
			);
		}
		if (req.body.Order) {
			updates = updates.concat(` Order = ${req.body.Order},`);
		}
		if (req.body.Quantity) {
			updates = updates.concat(` Quantity = ${req.body.Quantity},`);
		}
		if (req.body.QuantityAvailable) {
			updates = updates.concat(
				` QuantityAvailable = ${req.body.QuantityAvailable},`
			);
		}
		if (req.body.Picked === 1 || req.body.Picked === 0) {
			updates = updates.concat(` Picked = ${req.body.Picked},`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update ListContents
      set ${newUpdates}
      where ShoppingListId = ${req.body.ShoppingListId} and IngredientId = ${req.body.IngredientId};`;
			handleQuery(sql, res);
		}
	} else {
		res.sendStatus(400);
	}
});

app.patch('/listcontent/order', authenticate.authenticateToken, (req, res) => {
	if (req.body.ShoppingListId && req.body.IngredientId && req.body.Order) {
		for (let i = 0; i < req.body.IngredientId.length(); i++) {
			let sql = `update ListContents 
      set Order = ${req.body.Order[i]}
      where ShoppingListId = ${req.body.ShoppingListId}
      and IngredientId = ${req.body.IngredientId[i]};`;
			db.query(sql, (err, rows) => {
				if (err) {
					console.log(err);
					res.sendStatus(handleErrorResponse(err));
				} else {
					console.log(rows);
				}
			});
		}
		res.sendStatus(200);
	} else {
		res.sendStatus(400);
	}
});

app.listen(port, () => {
	console.log(`Server running, listening on port ${port}`);
});
