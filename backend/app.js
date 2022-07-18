const express = require('express');
const mysql = require('mysql2');

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

const app = express();

app.use(express.json());

// get requests

//recipes

app.get('/recipes', (req, res) => {
  let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, CONVERT_TZ(Recipes.RegisterDate, "GMT", 'Europe/Stockholm') as RegisterDate 
  from Recipes
  left join Users on Recipes.RecipeOwner = Users.UserId`;
  handleQuery(sql, res);
});

app.get('/recipe/:id', (req, res) => {
  let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, CONVERT_TZ(Recipes.RegisterDate, "GMT", 'Europe/Stockholm') as RegisterDate 
    from Recipes
    left join Users on Recipes.RecipeOwner = Users.UserId
    where RecipeId = ${req.params.id};`;
  handleQuery(sql, res);
});

// ingredients

app.get('/ingredients', (req, res) => {
  let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement 
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId`;
  handleQuery(sql, res);
});

app.get('/ingredient/:id', (req, res) => {
  let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId
  where IngredientId = ${req.params.id};`;
  handleQuery(sql, res);
});

//recipeingredients

app.get('/recipeingredient/:id', (req, res) => {
  let sql = `select IngredientName, Quantity, MeasurementName 
  from RecipeIngredients 
  left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId 
  where RecipeId = ${req.params.id};`;
  handleQuery(sql, res);
});

// measurements

app.get('/measurements', (req, res) => {
  let sql = 'select * from Measurements';
  handleQuery(sql, res);
});

// recipecalendar

app.get('/recipecalendar', (req, res) => {
  let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar`;
  handleQuery(sql, res);
});

app.get('/recipecalendar/:year/:month/:day', (req, res) => {
  let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate = "${req.params.year}-${req.params.month}-${req.params.day}"`;
  handleQuery(sql, res);
});

app.get(
  '/recipecalendar/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
  (req, res) => {
    let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate between "${req.params.yearstart}-${req.params.monthstart}-${req.params.daystart}" and "${req.params.yearstop}-${req.params.monthstop}-${req.params.daystop}"`;
    handleQuery(sql, res);
  }
);

// shoppinglists

app.get('/shoppinglists', (req, res) => {
  let sql = 'select * from ShoppingLists';
  handleQuery(sql, res);
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

    handleQuery(sql, res);
  }
);

// post requests

// recipes

app.post('/recipe', (req, res) => {
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

app.post('/ingredient', (req, res) => {
  console.log(req.body);
  let sql = `insert into Ingredients (IngredientName, 
    MeasurementId)
  values 
    ("${req.body.IngredientName}", 
    ${req.body.MeasurementId});`;

  handleQuery(sql, res);
});

// recipeingredients

app.post('/recipeingredient', (req, res) => {
  console.log(req.body);
  let sql = `insert into RecipeIngredients (RecipeId, IngredientId, Quantity)
  values 
    (${req.body.RecipeId}, 
    ${req.body.IngredientId}, 
    ${req.body.Quantity});`;

  handleQuery(sql, res);
});

// measurements

app.post('/measurement', (req, res) => {
  console.log(req.body);
  let sql = `insert into Measurements (MeasurementName)
  values 
    (${req.body.MeasurementName};`;

  handleQuery(sql, res);
});

// recipecalendar

app.post('/recipecalendar', (req, res) => {
  console.log(req.body);
  let sql = `insert into RecipeCalendar (RecipeDate, RecipeId, Portions)
  values 
    ("${req.body.RecipeDate}",
    ${req.body.RecipeId},
    ${req.body.Portions});`;

  handleQuery(sql, res);
});

// shoppinglists

app.post('/shoppinglist', (req, res) => {
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

app.post('/listcontent', (req, res) => {
  console.log(req.body);
  let sql;
  if (req.body.ShoppingListId) {
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

app.post('/listcontents/intervall', (req, res) => {
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
});

// delete requests

// recipes

app.delete('/recipe', (req, res) => {
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

app.delete('/ingredient', (req, res) => {
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

app.delete('/recipeingredient', (req, res) => {
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

app.delete('/measurement', (req, res) => {
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

// shoppinglists

app.listen('3000', () => {
  console.log('Server running, listening on port 3000');
});
