// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require("express"); // To build an application server or API
const app = express();
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcrypt"); //  To hash passwords
const axios = require("axios"); // To make HTTP requests from our server. We'll learn more about it in Part B.
app.use(express.static("src"));
// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: "db", // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set("view engine", "ejs"); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
// TODO - Include your API routes here

app.get("/", async (req, res) => {
  console.log(req.session.user);
  if (req.session.user == undefined) {
    res.render("pages/login", {
      message: "Log in to view your communities",
      error: "danger",
    });
  } else {
    const userCommunitiesQuery = 
    `SELECT communities.name 
      FROM users_to_communities 
      JOIN communities 
      ON users_to_communities.communityID = communities.communityID 
      WHERE users_to_communities.userID = $1`;

    try {
      // Fetch user's communities from the database
      const userCommunities = await db.any(userCommunitiesQuery, [req.session.user.userid]);

      console.log('User communities:', userCommunities);

      // Render the EJS template with the retrieved user communities
      res.render("pages/home", { userCommunities });
    } catch (error) {
      console.error('Error fetching user communities:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}); 

app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});

// <!-- Luke - Added API routes for register, login, logout, profile-->

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", async (req, res) => {
  try {
    //hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);

    const email_exists = await db.oneOrNone(
      "SELECT * FROM users WHERE email = $1",
      [req.body.email]
    );
    const user_exists = await db.oneOrNone(
      "SELECT * FROM users WHERE username = $1",
      [req.body.username]
    );

    if (email_exists) {
      res.render("pages/login", {
        message: "Email already exists. Please Log in",
        error: "danger",
      });
      //return res.status(401).json({ error: 'User already exists.' });
    }
    else if(user_exists){
      res.render('pages/register', {message: 'Username already exists. Enter alternate username', error: 'danger'});
    }
    else{
      const query = 'INSERT INTO users (fullName, email, username, password) VALUES ($1, $2, $3, $4)';
      await db.query(query, [req.body.fullName, req.body.email, req.body.username, hash]);
      res.render('pages/login', {data: req.session.user, message: 'Successfully registered'});
    }
  } catch (error) {
    console.error("Error while registering user: " + error);
    res
      .status(500)
      .json({ error: "An error occurred while registering the user." });
  }
});

app.get("/login", (req, res) => {
  if (req.session.user == undefined) {
    res.render("pages/login");
  } else {
    res.render("pages/profile", {
      data: req.session.user,
      message: "Already logged in",
    });
  }
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  try {
    const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
      req.body.username,
    ]);

    if (!user) {
      res.render("pages/login", { message: "User not found", error: "danger" });
    }

    const match = await bcrypt.compare(password, user.password);
    console.log(password);
    console.log(user.password);
    console.log(match);
    if(match == false){
      console.log('Incorrect password');
      res.render('pages/login', {message: 'Incorrect password', error: 'danger'});
    }
    else{
      req.session.user = user;
      req.session.save();
      console.log(req.session);
      res.render("pages/profile", {
        data: req.session.user,
        message: "Successfully logged in",
      });
    }
  } catch (error) {
    console.error("Error: " + error);
  }
});

app.get("/logout", function (req, res) {
  req.session.user = null;
  console.log(req.session);
  res.render("pages/login", { message: "Successfully logged out" });
});

app.get("/profile", async (req, res) => {
  console.log(req.session.user);
  if (req.session.user == undefined) {
    res.render("pages/login", {
      message: "Log in to view profile",
      error: "danger",
    });
  } else {
    const fquery = `
    SELECT *
    FROM friends
    RIGHT JOIN users
    ON friends.userIDB = users.userid
    WHERE userIDA = $1`;
    const friends = await db.query(fquery, [req.session.user.userid]);
    const info = (Object.assign(req.session.user, friends));
    console.log(info['0'].userIDB);
    res.render("pages/profile", {
      data: Object.assign(req.session.user, friends)
    });
  }
});

app.get("/friends", async (req, res) => {
  if(req.session.user == undefined){
    res.render("pages/login")
  }
  else{
    try{
      const friends = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1", [
       req.session.user.userid, 
      ]);
      console.log(friends);
      if(!friends){
        res.render("pages/friends", {
          user: "empty",
          friend: "no friends",
          community: "empty",
          empty: " ",
        });
      }
      const community = {
        name: undefined,
        desciption: undefined,
        communityid: undefined,
      };
      const find_communities = [];
      var index = 0;
      const result = 'SELECT * FROM users_to_communities JOIN communities ON users_to_communities.communityID = communities.communityID WHERE users_to_communities.userID = $1';
      for(i = 0; i < friends.length; i++){
        const friend_community = await db.query(result, [friends[i].useridb,]);
        for(j=0; j < friend_community.length; j++){
          const community = {
            name: friend_community[j].name,
            desciption: friend_community[j].description,
            communityid: friend_community[j].communityid,
          };
          find_communities[index] = community;
          index = index + 1;
        }
      }
        res.render("pages/friends", {
          user: "empty",
          friend: friends,
          community: find_communities,
          empty: " ",
        });
    }
    catch (error) {
      console.error("Error: " + error);
    }
  }
});

app.post("/user_search", async (req, res) =>{
  try{
      const friends = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1", [
       req.session.user.userid, 
      ]);
      const community = {
        name: undefined,
        desciption: undefined,
        communityid: undefined,
      };
      const find_communities = [];
      var index = 0;
      const result = 'SELECT * FROM users_to_communities JOIN communities ON users_to_communities.communityID = communities.communityID WHERE users_to_communities.userID = $1';
      for(i = 0; i < friends.length; i++){
        const friend_community = await db.query(result, [friends[i].useridb,]);
        for(j=0; j < friend_community.length; j++){
          const community = {
            name: friend_community[j].name,
            desciption: friend_community[j].description,
            communityid: friend_community[j].communityid,
          };
          find_communities[index] = community;
          index = index + 1;
        }
      }
    const users = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
      req.body.user,
    ]);
    if(!users){
      res.render("pages/friends", {
        user: "NOT_FOUND",
        friend: friends,
        community: find_communities,
        empty: " ",
      });
    }
    else{
      if(users.username == req.body.user){
        var friend = false;
        for(i = 0; i < friends.length; i++){
          if(users.username == friends[i].username){
            friend = true;
          }
        }
        res.render("pages/friends", {
          user: users,
          friend: friends,
          community: find_communities,
          empty: friend,
        });
      }
      else{
        res.render("pages/friends", {
          user: "empty",
          friend: friends,
          community: find_communities,
          empty: " ",
        });
      }
    }
  }
  catch (error) {
    console.error("Error: " + error);
  }
 });

app.post("/add_friend",async (req, res) =>{
  console.log(req.body.userADD);
  const user1 = req.session.user.userid;
  try{
    const query = "INSERT INTO friends (userIDA, userIDB, status) VALUES ($1, $2, $3) returning *";
    await db.one(query, [user1, req.body.userADD, 'pending']);
    res.redirect("/friends")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/remove_friend",async (req, res) =>{
  console.log(req.body.userREMOVE);
  const user1 = req.session.user.userid;
  try{
    const query = "DELETE friends WHERE userIDB = $1 AND userIDA =$2";
    await db.one(query, [req.body.userREMOVE,req.session.user.userid]);
    res.redirect("/friends")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.get("/discover", async (req, res) => {
  // res.render("pages/Discover");
  const allCommunitiesQuery = `SELECT * FROM communities`;
  const allEventsQuery = `SELECT * FROM events`;
  try {
    // Fetch data from the database
    const communities = await db.any(allCommunitiesQuery);
    const events = await db.any(allEventsQuery);
    console.log(communities, events)
    
    // Render the EJS template with the retrieved data
    res.render("pages/Discover", { allCommunities: communities, allEvents: events });
  } catch (error) {
    console.error("Error in /discover route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/create", (req, res) => {
  res.render("pages/create");
});


app.get('/preview-community', (req, res) => {
  const { name, description, filters } = req.query;
  // Split the filters string into an array if it's not empty
  const filtersArray = filters ? filters.split(',') : [];
  res.render('pages/previewCommunity', { name, description, filters: filtersArray });
});


app.post ('/create-community', async (req, res) => {
  try {
    const { name, description, filters } = req.body;

    const filtersString = Array.isArray(filters) ? filters.join(',') : '';

    const newCommunity = await db.query(
      "INSERT INTO communities (name, description, filters) VALUES($1, $2, $3) RETURNING *",
      [name, description, filtersString]
    );
      res.render("pages/discover", {message: "Community created"});
    // res.status(201).{ message: "Community created"};
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
})


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
