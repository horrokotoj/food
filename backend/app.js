const express = require('express');
const mysql = require('mysql2');

function handleErrorResponse(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return 409;
  } else if (
    err.code === 'ER_BAD_FIELD_ERROR' ||
    err.code === 'ER_PARSE_ERROR'
  ) {
    return 400;
  } else {
    return 500;
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
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

app.get('/recipe/:id', (req, res) => {
  let sql = `select Recipes.RecipeId, Recipes.RecipeName, Recipes.RecipeDesc, Recipes.RecipeImage, Recipes.RecipePortions, Users.UserName as RecipeOwner, CONVERT_TZ(Recipes.RegisterDate, "GMT", 'Europe/Stockholm') as RegisterDate 
    from Recipes
    left join Users on Recipes.RecipeOwner = Users.UserId
    where RecipeId = ${req.params.id};`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// ingredients

app.get('/ingredients', (req, res) => {
  let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement 
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

app.get('/ingredient/:id', (req, res) => {
  let sql = `select Ingredients.IngredientId, Ingredients.IngredientName, Measurements.MeasurementName as Measurement
  from Ingredients
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId
  where IngredientId = ${req.params.id};`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

//recipeingredients

app.get('/recipeingredient/:id', (req, res) => {
  let sql = `select IngredientName, Quantity, MeasurementName 
  from RecipeIngredients 
  left join Ingredients on RecipeIngredients.IngredientId = Ingredients.IngredientId 
  left join Measurements on Ingredients.MeasurementId = Measurements.MeasurementId 
  where RecipeId = ${req.params.id};`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// measurements

app.get('/measurements', (req, res) => {
  let sql = 'select * from Measurements';
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// recipecalendar

app.get('/recipecalendar', (req, res) => {
  let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

app.get('/recipecalendar/:year/:month/:day', (req, res) => {
  let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate = "${req.params.year}-${req.params.month}-${req.params.day}"`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

app.get(
  '/recipecalendar/intervall/:yearstart/:monthstart/:daystart/:yearstop/:monthstop/:daystop',
  (req, res) => {
    let sql = `select CONVERT_TZ(RecipeDate, "GMT", 'Europe/Stockholm') as RecipeDate, RecipeId, Portions from RecipeCalendar where RecipeDate between "${req.params.yearstart}-${req.params.monthstart}-${req.params.daystart}" and "${req.params.yearstop}-${req.params.monthstop}-${req.params.daystop}"`;
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
);

// shoppinglists

app.get('/shoppinglists', (req, res) => {
  let sql = 'select * from ShoppingLists';
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
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
        console.log(err);
        res.sendStatus(handleErrorResponse(err));
      } else {
        console.log(rows);

        res.send(rows);
      }
    });
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

  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// ingredients

app.post('/ingredient', (req, res) => {
  console.log(req.body);
  let sql = `insert into Ingredients (IngredientName, 
    MeasurementId)
  values 
    ("${req.body.IngredientName}", 
    ${req.body.MeasurementId});`;

  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// recipeingredients

app.post('/recipeingredient', (req, res) => {
  console.log(req.body);
  let sql = `insert into RecipeIngredients (RecipeId, IngredientId, Quantity)
  values 
    (${req.body.RecipeId}, 
    ${req.body.IngredientId}, 
    ${req.body.Quantity});`;

  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// measurements

app.post('/measurement', (req, res) => {
  console.log(req.body);
  let sql = `insert into Measurements (MeasurementName)
  values 
    (${req.body.MeasurementName};`;

  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// recipecalendar

app.post('/recipecalendar', (req, res) => {
  console.log(req.body);
  let sql = `insert into RecipeCalendar (RecipeDate, RecipeId, Portions)
  values 
    ("${req.body.RecipeDate}",
    ${req.body.RecipeId},
    ${req.body.Portions});`;

  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
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
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(handleErrorResponse(err));
    } else {
      console.log(rows);

      res.send(rows);
    }
  });
});

// delete requests

// recipes

// ingredients

// recipeingredients

// measurements

// recipecalendar

// shoppinglists

app.listen('3000', () => {
  console.log('Server running, listening on port 3000');
});
