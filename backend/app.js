const authenticate = require('./components/authenticate.js');

require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');

const app = express();

const jwt = require('jsonwebtoken');

const port = process.env.APP_PORT || 4000;

app.use(express.json());

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
	let sql = `select IngredientName, Quantity, MeasurementName 
  from RecipeIngredients 
  left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId 
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
		let sql1 = `delete from RecipeIngredients where RecipeId = ${req.body.RecipeId};`;

		let sql2 = `delete from Recipes where RecipeId = ${req.body.RecipeId};`;

		handleMultiQuery([sql1, sql2], res);
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
	console.log(req.body);
	if (req.body.RecipeId) {
		let updates = '';
		if (req.body.RecipeName) {
			updates = updates.concat(` RecipeName = "${req.body.RecipeName}",`);
		}
		if (req.body.RecipeDesc) {
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
		if (updates === '') {
			res.sendStatus(400);
		} else {
			const newUpdates = updates.slice(0, updates.length - 1);
			let sql = `update Recipes
      set ${newUpdates}
      where RecipeId = ${req.body.RecipeId};`;
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
