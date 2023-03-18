USE food_dev;

DROP TABLE IF EXISTS RecipeTags;
DROP TABLE IF EXISTS Tags;
DROP TABLE IF EXISTS TickedSteps;
DROP TABLE IF EXISTS ListContents;
DROP TABLE IF EXISTS ShoppingLists;
DROP TABLE IF EXISTS RecipeCalendar;
DROP TABLE IF EXISTS RecipeIngredients;
DROP TABLE IF EXISTS SectionOrder;
DROP TABLE IF EXISTS Stores;
DROP TABLE IF EXISTS Ingredients;
DROP TABLE IF EXISTS StoreSections;
DROP TABLE IF EXISTS Measurements;
DROP TABLE IF EXISTS Steps;
DROP TABLE IF EXISTS Recipes;
DROP TABLE IF EXISTS InHouseHold;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS HouseHolds;

CREATE TABLE HouseHolds
(
	HouseHoldId SERIAL PRIMARY KEY,
	HouseHoldName CHAR(50) NOT NULL,
    UNIQUE (HouseHoldName),
    HouseHoldOwner BIGINT UNSIGNED NOT NULL,
    DefaultStore BIGINT UNSIGNED
);

CREATE TABLE Users
(
	UserId SERIAL PRIMARY KEY,
	UserName CHAR(50) NOT NULL,
    UNIQUE (UserName),
	UserEmail CHAR(50) NOT NULL,
    UNIQUE (UserEmail),
    Token CHAR(255),
    Verified boolean default false,
    Pass CHAR(255) NOT NULL,
    DefaultStore BIGINT UNSIGNED default 0
);

CREATE TABLE InHouseHold
(
    HouseHoldId BIGINT UNSIGNED NOT NULL,
    UserId BIGINT UNSIGNED NOT NULL,
    Verified boolean default false,
    CONSTRAINT PK_InHouseHold PRIMARY KEY
	(
			HouseHoldId,
			UserId
	),
    FOREIGN KEY (HouseHoldId) REFERENCES HouseHolds (HouseHoldId),
    FOREIGN KEY (UserId) REFERENCES Users (UserId)
);

CREATE TABLE Recipes
(
	RecipeId SERIAL PRIMARY KEY,
	RecipeName CHAR(255) NOT NULL,
    UNIQUE (RecipeName),
    RecipeDesc CHAR(255),
    RecipeImage CHAR(255),
    RecipePortions FLOAT NOT NULL,
    RecipeOwner BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (RecipeOwner) REFERENCES Users (UserId),
    RegisterDate DATE NOT NULL,
    Public boolean default true NOT NULL
);

CREATE TABLE Steps
(
    StepId SERIAL PRIMARY KEY,
    Step BIGINT UNSIGNED NOT NULL,
    RecipeId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (RecipeId) REFERENCES Recipes (RecipeId),
    StepDesc CHAR(255) 
);

CREATE TABLE Measurements
(
    MeasurementId SERIAL PRIMARY KEY,
    MeasurementName CHAR(255) NOT NULL,
    UNIQUE (MeasurementName)
);

CREATE TABLE StoreSections
(
    StoreSectionId SERIAL PRIMARY KEY,
    StoreSectionName CHAR(255) NOT NULL,
    UNIQUE (StoreSectionName)
);

CREATE TABLE Ingredients
(
	IngredientId SERIAL PRIMARY KEY,
	IngredientName CHAR(255) NOT NULL,
    UNIQUE (IngredientName),
    MeasurementId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (MeasurementId) REFERENCES Measurements (MeasurementId),
    StoreSectionId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (StoreSectionId) REFERENCES StoreSections (StoreSectionId)
);

CREATE TABLE Stores
(
    StoreId SERIAL PRIMARY KEY,
	StoreName CHAR(255) NOT NULL,
    UNIQUE (StoreName)
);

CREATE TABLE SectionOrder
(
    StoreId BIGINT UNSIGNED NOT NULL,
    StoreSectionId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_SectionOrder PRIMARY KEY
	(
			StoreId,
			StoreSectionId
	),
    FOREIGN KEY (StoreId) REFERENCES Stores (StoreId),
    FOREIGN KEY (StoreSectionId) REFERENCES StoreSections (StoreSectionId),
    OrderOfSection BIGINT UNSIGNED NOT NULL
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
    RecipeCalendarId SERIAL PRIMARY KEY,
    UserId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users (UserId),
    RecipeDate DATE NOT NULL,
    RecipeId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (RecipeId) REFERENCES Recipes (RecipeId),
    Portions FLOAT NOT NULL
);

CREATE TABLE ShoppingLists
(
    ShoppingListId SERIAL PRIMARY KEY,
    ShoppingListName CHAR(255),
    UNIQUE (ShoppingListName),
    StartDate DATE,
    EndDate DATE,
    UserId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users (UserId),
    StoreId BIGINT UNSIGNED,
    FOREIGN KEY (StoreId) REFERENCES Stores (StoreId)
);

CREATE TABLE ListContents
(
    ShoppingListId BIGINT UNSIGNED NOT NULL,
    IngredientId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_ListContents PRIMARY KEY
	(
			ShoppingListId,
			IngredientId
	),
    FOREIGN KEY (ShoppingListId) REFERENCES ShoppingLists (ShoppingListId),
    FOREIGN KEY (IngredientId) REFERENCES Ingredients (IngredientId),
    Indexx BIGINT UNSIGNED default 0,
    IngredientName CHAR(255) NOT NULL, 
    Quantity FLOAT NOT NULL,
    QuantityAvailable FLOAT default 0,
    Picked BOOLEAN NOT NULL default false,
    MeasurementName CHAR(255) NOT NULL, 
    FOREIGN KEY (MeasurementName) REFERENCES Measurements (MeasurementName)
);

CREATE TABLE TickedSteps
(
    RecipeCalendarId BIGINT UNSIGNED NOT NULL,
    StepId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_TickedSteps PRIMARY KEY
	(
			RecipeCalendarId,
			StepId
	),
    FOREIGN KEY (RecipeCalendarId) REFERENCES RecipeCalendar (RecipeCalendarId),
    FOREIGN KEY (StepId) REFERENCES Steps (StepId)
);

CREATE TABLE Tags
(
	TagId SERIAL PRIMARY KEY,
	TagtName CHAR(255) NOT NULL,
    UNIQUE (TagtName)
);

CREATE TABLE RecipeTags
(
    RecipeId BIGINT UNSIGNED NOT NULL,
    TagId BIGINT UNSIGNED NOT NULL,
    CONSTRAINT PK_RecipeTags PRIMARY KEY
	(
			RecipeId,
			TagId
	),
    FOREIGN KEY (RecipeId) REFERENCES Recipes (RecipeId),
    FOREIGN KEY (TagId) REFERENCES Tags (TagId)
);


INSERT INTO Users (UserName, Pass, UserEmail, Verified)
VALUES
	('fakeuser', "password", 'fakeuser@fakeuser.nu', 1),
	('test', "$2b$10$QEPaYSPz9dqgrUUI.ZIzSuHy.819KiTSJS7ffvpVPUD1lv781eosG", "leo@horrokotoj.com", 1),
	('test2', "passwrod", "leo2@horrokotoj.com", 1);

INSERT INTO HouseHolds (HouseHoldName, HouseHoldOwner)
VALUES
    ("Familjen Arnholm Söderberg", 1);

INSERT INTO InHouseHold (HouseHoldId, UserId, Verified)
VALUES
    (1, 1, 1),
    (1, 2, 1);

INSERT INTO Recipes (RecipeName,
    RecipeDesc,
    RecipeImage,
    RecipePortions,
    RecipeOwner,
    RegisterDate)
VALUES
	('Köttfärssås', "Gott!", "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse1.mm.bing.net%2Fth%3Fid%3DOIP.5UrFhKHsjCzErhgaCjaZ8wHaFj%26pid%3DApi&f=1", 4.0, 1, "2022-07-12"),
	('Kräftpasta', "Mycket gott!", "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.z9agqeFaNLoFxZUIV5QvCAHaE8%26pid%3DApi&f=1", 4.0, 1, "2022-07-13");

INSERT INTO Measurements (MeasurementName)
VALUES
    ("gram"),
    ("ml"),
    ("st");

INSERT INTO StoreSections (StoreSectionName)
VALUES
    ("Hälsa & Skönhet"),
    ("Kläder"),
    ("Kök"),
    ("Lampor & Batterier"),
    ("Leksaker"),
    ("Baby"),
    ("Bröd"),
    ("Ost"),
    ("Pålägg"),
    ("Kött, Fisk & Skaldjur"),
    ("Korv"),
    ("Frukt & Grönt"),
    ("Juice"),
    ("Ägg"),
    ("Mejeri"),
    ("Frys"),
    ("Havremjölk & annat PK"),
    ("Glass"),
    ("Sylt & Marmelad"),
    ("Torkad frukt & Nötter"),
    ("Bak"),
    ("Glutenfritt"),
    ("Godis & Snacks"),
    ("Konserverad frukt"),
    ("Kaffe & Te"),
    ("Ris"),
    ("Pasta"),
    ("Tacos"),
    ("All världens mat"),
    ("Kryddor"),
    ("Buljong & Fond"),
    ("Olja & Vinäger"),
    ("Ketchup & Senap mm"),
    ("Konserver"),
    ("Husdjur"),
    ("Toa- & Hushållspapper"),
    ("Städ"),
    ("Dryck"),
    ("Kassan"),
    ("Övrigt");

INSERT INTO Ingredients (IngredientName, MeasurementId, StoreSectionId)
VALUES
    ("Nötfärs", 1, 10),
    ("Krossade Tomater", 1, 34),
    ("Gullök", 3, 12),
    ("Vitlöksklyfta", 3, 12),
    ("Tomatpuré", 2, 33),
    ("Kokosmjölk", 2, 29),
    ("Dijonsenap", 2, 33),
    ("Köttbuljongtärning", 3, 31),
    ("Oregano", 2, 12),
    ("Spaghetti", 1, 27),
    ("Linguini", 1, 27),
    ("Kräftskjärtar", 1, 10),
    ("Grädde", 2, 15),
    ("Sambal oelek", 2, 29),
    ("Purjulök", 3, 12);

INSERT INTO Stores (StoreName)
VALUES
    ("Ica Maxi Nacka");

update HouseHolds
set DefaultStore = 1 where HouseHoldId = 1;

INSERT INTO SectionOrder (StoreId, StoreSectionId, OrderOfSection)
VALUES
    (1, 1, 1),
    (1, 2, 2),
    (1, 3, 3), 
    (1, 4, 4), 
    (1, 5, 5),
    (1, 6, 6), 
    (1, 7, 7), 
    (1, 8, 8), 
    (1, 9, 9), 
    (1, 10, 10),  
    (1, 11, 11), 
    (1, 12, 12), 
    (1, 13, 13), 
    (1, 14, 14), 
    (1, 15, 15), 
    (1, 16, 16), 
    (1, 17, 17), 
    (1, 18, 18),  
    (1, 19, 19), 
    (1, 20, 20), 
    (1, 21, 21), 
    (1, 22, 22), 
    (1, 23, 23), 
    (1, 24, 24), 
    (1, 25, 25), 
    (1, 26, 26), 
    (1, 27, 27), 
    (1, 28, 28), 
    (1, 29, 29), 
    (1, 30, 30), 
    (1, 31, 31), 
    (1, 32, 32), 
    (1, 33, 33),
    (1, 34, 34),
    (1, 35, 35),
    (1, 36, 36),
    (1, 37, 37),
    (1, 38, 38),
    (1, 39, 39),
    (1, 40, 40);

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

INSERT INTO Steps (Step, RecipeId, StepDesc)
VALUES
    (1, 1, "Ta fram alla ingredienser"),
    (2, 1, "Laga maten"),
    (3, 1, "Servera maten");

INSERT INTO RecipeCalendar (UserId,RecipeDate, RecipeId, Portions)
VALUES
    (1, "2022-12-15", 1, 4),
    (1, "2022-12-16", 2, 4),
    (1, "2022-12-17", 1, 4),
    (1, "2022-12-18", 2, 2),
    (3, "2022-12-18", 2, 2);