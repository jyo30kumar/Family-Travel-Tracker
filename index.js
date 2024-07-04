import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "admin",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];
async function getCurrentUser(){
  const result = await db.query("select * from users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  console.log(countries);
  const currentUser = await getCurrentUser();
  console.log(currentUser.color);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  }); 
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (error) {
      console.log("Execution of query failed - ", error);
      const countries = await checkVisisted();
      res.render("index.ejs", {
        countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
        error: "Duplicate Entry. Try again.",
      });
    }
  } catch (error) {
    console.log("Execution of query failed - ", error);
    const countries = await checkVisisted();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Country doesn't exist. Try again",
    });
  }
});

app.post("/user", async (req, res) => {
    if(req.body.add === "new"){
      res.render("new.ejs");
    }else{
      currentUserId = req.body.user;
      res.redirect("/");
    }
});

app.post("/new", async (req, res) => {
  const data = {name : req.body.name, color : req.body.color};
  const result = await db.query("insert into users (name, color) values($1, $2)", [data.name, data.color]);
  const id = result.rows[0].id;
  id = currentUserId;
  res.redirect("/");
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
