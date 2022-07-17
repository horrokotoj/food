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
