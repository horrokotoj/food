const express = require('express');
const mysql = require('mysql2');

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

const app = express();

app.get('/recipes', (req, res) => {
	let sql = 'select * from Recipes';
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get('/ingredients', (req, res) => {
	let sql = 'select * from Ingredients';
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get('/measurements', (req, res) => {
	let sql = 'select * from Measurements';
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get('/recipecalendar', (req, res) => {
	let sql = 'select * from RecipeCalendar';
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get('/recipecalendar/:year/:month/:day', (req, res) => {
	let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate = "${req.params.year}-${req.params.month}-${req.params.day}"`;
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get(
	'/recipecalendar/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
	(req, res) => {
		let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate between "${req.params.yearstart}-${req.params.monthstart}-${req.params.daystart}" and "${req.params.yearstop}-${req.params.monthstop}-${req.params.daystop}"`;
		db.query(sql, (err, rows) => {
			if (err) {
				throw err;
			}
			console.log(rows);

			res.send(rows);
		});
	}
);

app.get('/shoppinglists', (req, res) => {
	let sql = 'select * from ShoppingLists';
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.get(
	'/shoppinglist/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
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

		db.query(sql, (err, rows) => {
			if (err) {
				throw err;
			}
			console.log(rows);

			res.send(rows);
		});
	}
);

app.get('/recipe/:id', (req, res) => {
	let sql = `select IngredientName, Quantity, MeasurementName from RecipeIngredients left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId where RecipeId = ${req.params.id};`;
	db.query(sql, (err, rows) => {
		if (err) {
			throw err;
		}
		console.log(rows);

		res.send(rows);
	});
});

app.listen('3000', () => {
	console.log('Server running, listening on port 3000');
});
