USE food_dev;

DROP TABLE IF EXISTS ListContents;
DROP TABLE IF EXISTS ShoppingLists;
DROP TABLE IF EXISTS RecipeCalendar;
DROP TABLE IF EXISTS RecipeIngredients;
DROP TABLE IF EXISTS Ingredients;
DROP TABLE IF EXISTS Measurements;
DROP TABLE IF EXISTS Recipes;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users
(
	UserId SERIAL PRIMARY KEY,
	UserName CHAR(50) NOT NULL,
    Pass CHAR(50) NOT NULL
);

CREATE TABLE Recipes
(
	RecipeId SERIAL PRIMARY KEY,
	RecipeName CHAR(255) NOT NULL,
    RecipeDesc CHAR(255),
    RecipeImage CHAR(255),
    RecipePortions FLOAT NOT NULL,
    RecipeOwner BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (RecipeOwner) REFERENCES Users (UserId),
    RegisterDate DATE NOT NULL
);

CREATE TABLE Measurements
(
    MeasurementId SERIAL PRIMARY KEY,
    MeasurementName CHAR(255) NOT NULL
);

CREATE TABLE Ingredients
(
	IngredientId SERIAL PRIMARY KEY,
	IngredientName CHAR(255) NOT NULL,
    MeasurementId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (MeasurementId) REFERENCES Measurements (MeasurementId)
);

CREATE TABLE RecipeIngredients
(
    RecipeId BIGINT UNSIGNED NOT NULL,
    IngredientId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_RecipeIngredients PRIMARY KEY
	(
			RecipeId,
			IngredientId
	),
    FOREIGN KEY (RecipeId) REFERENCES Recipes (RecipeId),
    FOREIGN KEY (IngredientId) REFERENCES Ingredients (IngredientId),
    Quantity FLOAT NOT NULL
);

CREATE TABLE RecipeCalendar
(
    RecipeCalendarID SERIAL PRIMARY KEY,
    RecipeDate DATE NOT NULL,
    RecipeId BIGINT UNSIGNED NOT NULL,
    Portions FLOAT NOT NULL,
    FOREIGN KEY (RecipeId) REFERENCES Recipes (RecipeId)
);

CREATE TABLE ShoppingLists
(
    ShoppingListId SERIAL PRIMARY KEY,
    StartDate DATE,
    EndDate DATE
);

CREATE TABLE ListContents
(
    ShoppingListId BIGINT UNSIGNED NOT NULL,
    IngredientId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_RecipeIngredients PRIMARY KEY
	(
			ShoppingListId,
			IngredientId
	),
    FOREIGN KEY (ShoppingListId) REFERENCES ShoppingLists (ShoppingListId),
    FOREIGN KEY (IngredientId) REFERENCES Ingredients (IngredientId),
    IngredientName CHAR(255) NOT NULL, 
    Quantity FLOAT NOT NULL,
    QuantityAvailable FLOAT,
    Picked BOOLEAN NOT NULL
);

INSERT INTO Users (UserName, Pass)
VALUES
	('Leo', "password"),
	('Erica', "password");

INSERT INTO Recipes (RecipeName,
    RecipeDesc,
    RecipeImage,
    RecipePortions,
    RecipeOwner,
    RegisterDate)
VALUES
	('Köttfärsås', "Gott!", "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%3Fid%3DOIP.5UrFhKHsjCzErhgaCjaZ8wHaFj%26pid%3DApi&f=1", 4.0, 1, "2022-07-12"),
	('Kräftpasta', "Mycket gott!", "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.z9agqeFaNLoFxZUIV5QvCAHaE8%26pid%3DApi&f=1", 4.0, 2, "2022-07-13");

INSERT INTO Measurements (MeasurementName)
VALUES
    ("gram"),
    ("ml"),
    ("st");

INSERT INTO Ingredients (IngredientName, MeasurementId)
VALUES
    ("Nötfärs", 1),
    ("Krossade Tomater", 1),
    ("Gullök", 3),
    ("Vitlöksklyfta", 3),
    ("Tomatpuré", 2),
    ("Kokosmjölk", 2),
    ("Dijonsenap", 2),
    ("Köttbuljongtärning", 3),
    ("Oregano", 2),
    ("Spaghetti", 1),
    ("Linguini", 1),
    ("Kräftskjärtar", 1),
    ("Grädde", 2),
    ("Sambal oelek", 2),
    ("Purjulök", 3);

INSERT INTO RecipeIngredients (RecipeId, IngredientId, Quantity)
VALUES
    (1, 1, 500),
    (1, 2, 400),
    (1, 3, 1),
    (1, 4, 1),
    (1, 5, 15),
    (1, 6, 200),
    (1, 7, 5),
    (1, 8, 1),
    (1, 9, 5),
    (1, 10, 450),
    (2, 11, 450),
    (2, 12, 200),
    (2, 13, 200),
    (2, 14, 5),
    (2, 15, 0.5);

INSERT INTO RecipeCalendar (RecipeDate, RecipeId, Portions)
VALUES
    ("2022-07-15", 1, 4),
    ("2022-07-16", 2, 4);