// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require("express"); // To build an application server or API
const app = express();
const { Pool } = require('pg');
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

// functions *****************
async function loadProfile(arg) {
  const fquery = `
  SELECT *
  FROM friends
  RIGHT JOIN users
  ON friends.useridB = users.userid
  WHERE userIDA = $1`;
  const cquery = `
  SELECT *
  FROM users_to_communities
  RIGHT JOIN communities
  ON users_to_communities.communityID = communities.communityID
  WHERE users_to_communities.userID = $1`;
  const equery = `
  SELECT *
  FROM users_to_events
  RIGHT JOIN events
  ON users_to_events.eventID = events.eventID
  WHERE users_to_events.userID = $1`;
  const friendInfo = await db.query(fquery, [arg.userid]);
  const userInfo = arg;
  const commInfo = await db.query(cquery, [arg.userid]);
  const eventInfo = await db.query(equery, [arg.userid]);


    return {
      uList: userInfo,
      fList: friendInfo,
      cList: commInfo,
      eList: eventInfo
    };
}
// ****************************************************

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
    } else if (user_exists) {
      res.render("pages/register", {
        message: "Username already exists. Enter alternate username",
        error: "danger",
      });
    } else {
      const query =
        "INSERT INTO users (fullName, email, username, password) VALUES ($1, $2, $3, $4)";
      await db.query(query, [
        req.body.fullName,
        req.body.email,
        req.body.username,
        hash,
      ]);
      res.render("pages/login", {
        data: req.session.user,
        message: "Successfully registered",
      });
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
    if (match == false) {
      console.log("Incorrect password");
      res.render("pages/login", {
        message: "Incorrect password",
        error: "danger",
      });
    } else {
      req.session.user = user;
      req.session.save();
      res.render("pages/profile", {
        data: await loadProfile(req.session.user),
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
    try{
      res.render("pages/profile", {
        data: await loadProfile(req.session.user)
      });
    }
    catch(error){
      console.error("Error in /profile route:", error);
      res.status(500).send("Internal Server Error");
    }
  }
});

const pool = new Pool({
  host: "db", // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
});

app.get("/friendProfile/:friendID", async (req, res) => {
    try{
      const profile = req.params.friendID;
      const p = 'SELECT * FROM users WHERE userID = $1';
      const { rows } = await pool.query(p, [profile]);
      console.log(rows[0]);
      res.render("pages/friendProfile", {
        data: await loadProfile(rows[0])
      });
    }
    catch(error){
      console.error("Error in /profile route:", error);
      res.status(500).send("Internal Server Error");
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
          var friend = "false";
          for(i = 0; i < friends.length; i++){
            if(users.username == friends[i].username){
              if(friends[i].status == "friends"){
                friend = "true";
              }
              else{
                friend = "pending";
              }
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
    const user1 = req.session.user.userid;
    try{
      const query = "INSERT INTO friends (userIDA, userIDB, status) VALUES ($1, $2, $3) returning *";
      await db.one(query, [user1, req.body.userADD, 'sent']);
      const query2 = "INSERT INTO friends (userIDA, userIDB, status) VALUES ($1, $2, $3) returning *";
      await db.one(query2, [req.body.userADD,user1, 'pending']);
      res.redirect("/friends")
    }
    catch (error) {
      console.error("Error: " + error);
    }
  });
  
  app.post("/accept_friend",async (req, res) =>{
    const user1 = req.session.user.userid;
    try{
      const query = "UPDATE friends SET status = 'friends' WHERE userIDA = $1 AND userIDB = $2 returning *";
      await db.one(query, [user1, req.body.userid]);
      const query2 = "UPDATE friends SET status = 'friends' WHERE userIDA = $1 AND userIDB = $2 returning *";
      await db.one(query2, [req.body.userid,user1]);
      res.redirect("/friends")
    }
    catch (error) {
      console.error("Error: " + error);
    }
  });
  
  app.post("/remove_friend",async (req, res) =>{
    try{
      const query = "DELETE FROM friends WHERE userIDB = $1 AND userIDA =$2 returning *";
      await db.one(query, [req.body.userid,req.session.user.userid]);
      const query2 = "DELETE FROM friends WHERE userIDA = $1 AND userIDB =$2 returning *";
      await db.one(query2, [req.body.userid,req.session.user.userid]);
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
    console.log(communities, events);

    // Render the EJS template with the retrieved data
    res.render("pages/Discover", {
      allCommunities: communities,
      allEvents: events,
    });
  } catch (error) {
    console.error("Error in /discover route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/addUserToCommunity/:id", async (req, res) => {
  const communityId = req.params.id;
  // console.log("req.body", communityId);
  // const communityId = allCommunities;
  // console.log(communityId);
  const userId = req.session.user.userid;
  const query = `INSERT INTO users_to_communities (userID, communityID) VALUES ($1, $2)`;
  try {
    await db.query(query, [userId, communityId]);
    // console.log("community", communityId);
    // console.log("User", req.session.user)
    // console.log("userid", userId);
    console.log("success");

    setTimeout(() => {
      res.redirect("/discover");
    }, 4700); // 2000 milliseconds (2 seconds)
    // res.render("pages/discover", { message: "User added to community" });
    // res.status(200).send("User added to community");
    // const allCommunitiesQuery = `SELECT * FROM communities`;
    // const communityName = `SELECT name FROM communities WHERE communityID = ${communityId}`;
    // const allEventsQuery = `SELECT * FROM events`;
    /*
    try {
      // Fetch data from the database
      const communities = await db.any(allCommunitiesQuery);
      const events = await db.any(allEventsQuery);
      // console.log(communities, events);

      // Render the EJS template with the retrieved data

      // res.render("pages/Discover", {
      //   allCommunities: communities,
      //   allEvents: events,
      //   // message: "You joined " + communityName,
      //   message: "You Joined Successfully!"
      // });
    } catch (error) {
      console.error("Error in /discover route:", error);
      res.status(500).send("Internal Server Error");
    }
    */
  } catch (error) {
    console.log("error:", error);
    console.error("Error in /addUserToCommunity route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/addUserToEvent/:id", async (req, res) => {
  const eventId = req.params.id;
  // console.log("req.body", communityId);
  // const communityId = allCommunities;
  // console.log(communityId);
  const userId = req.session.user.userid;
  const query = `INSERT INTO users_to_events (userID, eventId) VALUES ($1, $2)`;
  try {
    await db.query(query, [userId, eventId]);
    // console.log("Event", eventId);
    // console.log("User", req.session.user)
    // console.log("userid", userId);
    console.log("success");

    setTimeout(() => {
      res.redirect("/discover");
    }, 4700); // 2000 milliseconds (2 seconds)
    // res.redirect("/discover");
  } catch (error) {
    console.log("error:", error);
    console.error("Error in /addUserToEvent route:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/create", (req, res) => {
  if(req.session.user == undefined){
    res.render("pages/login", { message: "Please Login to Create a Community", error: "danger"});  
  }
    else {
  res.render("pages/create");
    }
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
    const userID = req.session.user.userid;

    //check for existing communities
    const existingCommunity = await db.query(
      "SELECT * FROM communities WHERE name = $1",
      [name]
    );

   if (existingCommunity > 0) {
      return res.render('pages/create', { message: 'Community already exists!', error: 'danger' });
    }


    const filtersString = Array.isArray(filters) ? filters.join(',') : '';

    const newCommunity = await db.query(
      "INSERT INTO communities (name, description, filters, adminUserID) VALUES($1, $2, $3, $4) RETURNING *",
      [name, description, filtersString, userID]
    );
    res.render('pages/create', { message: 'Community created successfully!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
