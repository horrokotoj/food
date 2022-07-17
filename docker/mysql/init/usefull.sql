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
