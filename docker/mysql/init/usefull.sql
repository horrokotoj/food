select Ingredients.IngredientName, sum((RecipeCalendar.Portions/Recipes.RecipePortions)*RecipeIngredients.Quantity) 
as FinalQuantity from RecipeCalendar
left join Recipes
on RecipeCalendar.RecipeId = Recipes.RecipeId
left join RecipeIngredients
on Recipes.RecipeId = RecipeIngredients.RecipeId
left join Ingredients
on RecipeIngredients.IngredientId = Ingredients.IngredientId
where RecipeCalendar.RecipeDate between "2022-07-15" and "2022-07-18"
group by IngredientName;

insert into ListContents (ShoppingListId, IngredientId, Ingredientname, Quantity, Picked)
select 6, Ingredients.IngredientId, Ingredients.IngredientName, sum((RecipeCalendar.Portions/Recipes.RecipePortions)*RecipeIngredients.Quantity) 
as Quantity, false from RecipeCalendar
left join Recipes
on RecipeCalendar.RecipeId = Recipes.RecipeId
left join RecipeIngredients
on Recipes.RecipeId = RecipeIngredients.RecipeId
left join Ingredients
on RecipeIngredients.IngredientId = Ingredients.IngredientId
where RecipeCalendar.RecipeDate between "2022-07-15" and "2022-07-18"
group by IngredientId;

insert into ListContents (ShoppingListId, IngredientId, Ingredientname, Quantity, Picked)
select 6, Ingredients.IngredientId, Ingredients.IngredientName, sum((RecipeCalendar.Portions/Recipes.RecipePortions)*RecipeIngredients.Quantity) 
as Quantity, false from RecipeCalendar
left join Recipes
on RecipeCalendar.RecipeId = Recipes.RecipeId
left join RecipeIngredients
on Recipes.RecipeId = RecipeIngredients.RecipeId
left join Ingredients
on RecipeIngredients.IngredientId = Ingredients.IngredientId
where RecipeCalendar.RecipeDate between 
(select StartDate from ShoppingLists where ShoppingListId = 6)
and
(select EndDate from ShoppingLists where ShoppingListId = 6)
group by IngredientId;


insert into Recipes (RecipeName, 
    RecipeDesc, 
    RecipeImage, 
    RecipePortions, 
    RecipeOwner, 
    RegisterDate)
  values 
    ("Carbonara", 
    "Enkelt!",
    "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%3Fid%3DOIP.50zsqsXQjuMECam7EngNqgHaHa%26pid%3DApi&f=1", 
    4, 
    1,
    curdate());

insert into RecipeIngredients (RecipeId, IngredientId, Quantity)
values
    ((select RecipeId from Recipes where RecipeName = "Carbonara"), 10, 450);