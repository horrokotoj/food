const authenticate = require('./components/authenticate.js');

require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

const app = express();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const port = process.env.APP_PORT || 4000;

app.use(express.json());

function generateAccessToken(user) {
	return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
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
async function verificationMail({ username, email }, res) {
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

	let mailOptions = {
		from: `"food verifier" <${process.env.VER_EMAIL}>`, // sender address
		to: email, // list of receivers
		subject: 'food verification request', // Subject line
		text: `Hello ${username}`, // plain text body
		html: '<b>Hello world?</b>', // html body
	};

	// send mail with defined transport object
	if (
		await transporter.sendMail(mailOptions, (error, info, res) => {
			if (error) {
				console.log(error);
				return false;
			} else {
				console.log(`Message sent: ${info.messageId}`);
				return true;
			}
		})
	) {
		console.log('here');
		res.sendStatus(200);
	} else {
		res.sendStatus(500);
	}
}

// Create connection to database
const db = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB,
});

// Connect to db
db.connect((err) => {
	if (err) {
		throw err;
	}
	console.log('Connected to db');
});

app.post('/user', (req, res) => {
	if (req.body.username && req.body.password && req.body.email) {
		const username = req.body.username;
		const email = req.body.email;
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
									verificationMail({ username: username, email: email }, res);
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

// Auth

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
	let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, CONVERT_TZ(Recipes.RegisterDate, "GMT", 'Europe/Stockholm') as RegisterDate 
  from Recipes
  left join Users on Recipes.RecipeOwner = Users.UserId`;
	handleQuery(sql, res);
});

app.get('/recipe/:id', authenticate.authenticateToken, (req, res) => {
	let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, CONVERT_TZ(Recipes.RegisterDate, "GMT", 'Europe/Stockholm') as RegisterDate 
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

// recipecalendar

app.get('/recipecalendar', authenticate.authenticateToken, (req, res) => {
	let sql = `select RecipeCalendarId, CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar`;
	handleQuery(sql, res);
});

app.get(
	'/recipecalendar/:year/:month/:day',
	authenticate.authenticateToken,
	(req, res) => {
		let sql = `select RecipeCalendarId, CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate = "${req.params.year}-${req.params.month}-${req.params.day}"`;
		handleQuery(sql, res);
	}
);

app.get(
	'/recipecalendar/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
	authenticate.authenticateToken,
	(req, res) => {
		let sql = `select RecipeCalendarId, CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate between "${req.params.yearstart}-${req.params.monthstart}-${req.params.daystart}" and "${req.params.yearstop}-${req.params.monthstop}-${req.params.daystop}"`;
		handleQuery(sql, res);
	}
);

// shoppinglists

app.get('/shoppinglists', authenticate.authenticateToken, (req, res) => {
	let sql = 'select * from ShoppingLists';
	handleQuery(sql, res);
});

app.get(
	'/shoppinglist/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
	authenticate.authenticateToken,
	(req, res) => {
		let sql = `select Ingredients.IngredientName, sum((RecipeCalendar.Portions/Recipes.RecipePortions)*RecipeIngredients.Quantity) as FinalQuantity from RecipeCalendar
  left join Recipes
  on RecipeCalendar.RecipeId = Recipes.RecipeId 
  left join RecipeIngredients 
  on Recipes.RecipeId = RecipeIngredients.RecipeId
  left join Ingredients 
  on RecipeIngredients.IngredientId = Ingredients.IngredientId 
  where RecipeCalendar.RecipeDate between "${req.params.yearstart}-${req.params.monthstart}-${req.params.daystart}" and "${req.params.yearstop}-${req.params.monthstop}-${req.params.daystop}"
  group by IngredientName;`;

		handleQuery(sql, res);
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
    MeasurementId)
  values 
    ("${req.body.IngredientName}", 
    ${req.body.MeasurementId});`;

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
	let sql = `insert into RecipeCalendar (RecipeDate, RecipeId, Portions)
  values 
    ("${req.body.RecipeDate}",
    ${req.body.RecipeId},
    ${req.body.Portions});`;

	handleQuery(sql, res);
});

// shoppinglists

app.post('/shoppinglist', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql;
	if (req.body.ShoppingListName) {
		if (req.body.StartDate && req.body.EndDate) {
			sql = `insert into ShoppingLists (ShoppingListName, StartDate, EndDate)
        values 
        ("${req.body.ShoppingListName}",
        "${req.body.StartDate}",
        "${req.body.EndDate}");`;
		} else {
			sql = `insert into ShoppingLists (ShoppingListName)
        values 
        ("${req.body.ShoppingListName}");`;
		}
	} else if (req.body.StartDate && req.body.EndDate) {
		sql = `insert into ShoppingLists (StartDate ,EndDate)
      values 
      ("${req.body.StartDate}",
      "${req.body.EndDate}");`;
	} else {
		res.sendStatus(400);
	}
	handleQuery(sql, res);
});

// listcontents

app.post('/listcontent', authenticate.authenticateToken, (req, res) => {
	console.log(req.body);
	let sql;
	if (req.body.ShoppingListId && req.body.IngredientId && req.body.Quantity) {
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
					sql = `insert into ListContents (ShoppingListId, IngredientId, IngredientName, Quantity, Picked)
            values (${req.body.ShoppingListId}, 
            ${req.body.IngredientId}, 
            (select IngredientName from Ingredients where IngredientId = ${req.body.IngredientId}), 
            ${req.body.Quantity}, 
            false);`;

					handleQuery(sql, res);
				}
			}
		});
	} else {
		res.sendStatus(400);
	}
});

app.post(
	'/listcontents/intervall',
	authenticate.authenticateToken,
	(req, res) => {
		console.log(req.body);
		if (req.body.ShoppingListId) {
			let sql = `insert into ListContents (ShoppingListId, IngredientId, Ingredientname, Quantity, Picked)
    select ${req.body.ShoppingListId}, Ingredients.IngredientId, Ingredients.IngredientName, sum((RecipeCalendar.Portions/Recipes.RecipePortions)*RecipeIngredients.Quantity) 
    as Quantity, false from RecipeCalendar
    left join Recipes
    on RecipeCalendar.RecipeId = Recipes.RecipeId
    left join RecipeIngredients
    on Recipes.RecipeId = RecipeIngredients.RecipeId
    left join Ingredients
    on RecipeIngredients.IngredientId = Ingredients.IngredientId
    where RecipeCalendar.RecipeDate between 
    (select StartDate from ShoppingLists where ShoppingListId = ${req.body.ShoppingListId})
    and
    (select EndDate from ShoppingLists where ShoppingListId = ${req.body.ShoppingListId})
    group by IngredientId;`;

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

// recipes

app.patch('/recipe', authenticate.authenticateToken, (req, res) => {
	if (req.body.RecipeId) {
		let updates = '';
		if (req.body.RecipeName) {
			updates = updates.concat(` RecipeName = "${req.body.RecipeName}",`);
		}
		if (req.body.RecipeDesc) {
			console.log('here');
			updates = updates.concat(` RecipeDesc = "${req.body.RecipeDesc}",`);
		}
		if (req.body.RecipeSteps) {
			updates = updates.concat(` RecipeSteps = "${req.body.RecipeSteps}",`);
		}
		if (req.body.RecipeImage) {
			updates = updates.concat(` RecipeImage = "${req.body.RecipeImage}",`);
		}
		if (req.body.RecipePortions) {
			updates = updates.concat(` RecipePortions = ${req.body.RecipePortions},`);
		}
		if (req.body.RecipeOwner) {
			updates = updates.concat(` RecipeOwner = "${req.body.RecipeOwner}",`);
		}
		if (req.body.RegisterDate) {
			updates = updates.concat(` RegisterDate = "${req.body.RegisterDate}",`);
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
			updates = updates.concat(` MeasurementId = "${req.body.MeasurementId}",`);
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
		if (req.body.Picked) {
			updates = updates.concat(` Picked = ${req.body.Picked},`);
		}
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update ShoppingLists
      set ${newUpdates}
      where ShoppingListId = ${req.body.ShoppingListId} 
      and IngredientId = ${req.body.IngredientId};`;
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
