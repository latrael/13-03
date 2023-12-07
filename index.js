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

const cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'dzhqemlkr', 
  api_key: '934727676964224', 
  api_secret: 'pYMapPWdI3pStFxJP6MKeeJNpI4' 
});
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
  WHERE userIDA = $1 AND status = 'friends'`;
  const cquery = `
  SELECT *
  FROM users_to_communities
  RIGHT JOIN communities
  ON users_to_communities.communityID = communities.communityID
  WHERE users_to_communities.userID = $1`;
  const equery = `
  SELECT DISTINCT *
  FROM users_to_events
  RIGHT JOIN events
  ON users_to_events.eventID = events.id
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
    `SELECT communities.name, communities.communityID
    FROM users_to_communities 
    JOIN communities ON users_to_communities.communityID = communities.communityID 
    WHERE users_to_communities.userID = $1`;

    const eventsQuery = `
    SELECT 
    events.* 
    FROM 
    users_to_events 
    JOIN 
    events ON users_to_events.eventID = events.id 
    WHERE 
    users_to_events.userID = $1;`;

      //const userEventsQuery = `SELECT communities.name FROM users_to_communities JOIN communities ON users_to_communities.communityID = communities.communityID WHERE users_to_communities.userID = $1`;

    try {
      // Fetch user's communities from the database
      const userCommunities = await db.any(userCommunitiesQuery, [req.session.user.userid]);

      console.log('User communities:', userCommunities);

      const communityEvents = await db.any(eventsQuery, [req.session.user.userid]);
      console.log('Community events:', JSON.stringify(communityEvents, null, 2));

      // Render the EJS template with the retrieved user communities
      res.render("pages/home", { userCommunities , communityEvents });
    } catch (error) {
      console.error('Error fetching user communities:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}); 

app.get("/community/:communityID", async (req, res) => {
  const communityID = req.params.communityID;

  try {
    // Fetch community details
    const communityDetailsQuery = `
      SELECT communities.name, communities.description, communities.filters, communities.communityID, communities.adminUserID
      FROM communities
      WHERE communities.communityID = $1`;

    // Fetch members of the community
    const communityMembersQuery = `
      SELECT users.fullName, users.username
      FROM users
      JOIN users_to_communities ON users.userID = users_to_communities.userID
      WHERE users_to_communities.communityID = $1`;
    
    const communityEventsQuery = `
      SELECT *
      FROM communities_to_events
      JOIN events ON communities_to_events.eventID = events.id
      WHERE communities_to_events.communityID = $1`;

    const yourEventsQuery = `
      SELECT *
      FROM users_to_events
      WHERE users_to_events.userID = $1`;

    const [communityDetails, communityMembers, communityEvents, yourEvents] = await Promise.all([
      db.oneOrNone(communityDetailsQuery, [communityID]),
      db.manyOrNone(communityMembersQuery, [communityID]),
      db.manyOrNone(communityEventsQuery, [communityID]),
      db.manyOrNone(yourEventsQuery, [req.session.user.userid]),
    ]);

    if (communityDetails) {
      console.log("Community Members:", communityMembers);
      console.log("Community Details", communityDetails);
      console.log("community Events", communityEvents);
      console.log("Your events", yourEvents)

    var index = 0;
    var events = [];
    for(i = 0; i < communityEvents.length; i++){
      var status = "false";
      for(j = 0; j < yourEvents.length; j++){
        if(yourEvents[j].eventid == communityEvents[i].eventid){
          status = "true";
        }
      }
      const event = {
        title: communityEvents[i].title,
        start: communityEvents[i].start,
        end: communityEvents[i].end,
        extendedProps: {
          location: communityEvents[i].description,
          eventID: communityEvents[i].id,
          communityID: communityEvents[i].communityid,
          status: status,
        },
      };
      events[index] = event;
      index = index + 1;
    }
    var member = "false";
    for(i = 0; i < communityMembers.length; i++){
      if(communityMembers[i].username == req.session.user.username){
        member = "true";
      }
    }
    console.log(events);
      res.render("pages/viewCommunity", {
        communityMembers,
        communityDetails,
        events,
        member,
        user: req.session.user,
        isAdmin: communityDetails.adminuserid == req.session.user.userid,
      });
    } else {
      // Handle case where the community is not found
      res.status(404).send("Community not found");
    }
  } catch (error) {
    console.error("Error in /community/:communityID route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/addUserToCommunity2/:id", async (req, res) => {
  const communityId = req.params.id;
  const userId = req.session.user.userid;
  const query = `INSERT INTO users_to_communities (userID, communityID) VALUES ($1, $2)`;
  const communityMembersQuery = `
      SELECT users.fullName, users.username
      FROM users
      JOIN users_to_communities ON users.userID = users_to_communities.userID
      WHERE users_to_communities.communityID = $1`;
  try {
    const members = await db.manyOrNone(communityMembersQuery, [communityId]);
    var member = "false"
    for(i = 0; i < members.length; i++){
      if(members[i].username == req.session.user.username){
        member = "true";
      }
    }
    if(member == "false"){
      await db.query(query, [userId, communityId]);
    }

    setTimeout(() => {
      res.redirect("/community/"+communityId);
    }, 2000);
  } catch (error) {
    console.log("error:", error);
    console.error("Error in /addUserToCommunity route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/leave_community/:id",async (req, res) =>{
  const communityId = req.params.id;
  try{
    const query = "DELETE FROM users_to_communities WHERE userID = $1 AND communityID =$2 returning *";
    await db.one(query, [req.session.user.userid,communityId]);
    res.redirect("/community/" + communityId);
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/leave_community2/:id",async (req, res) =>{
  const communityId = req.params.id;
  try{
    const query = "DELETE FROM users_to_communities WHERE userID = $1 AND communityID =$2 returning *";
    await db.one(query, [req.session.user.userid,communityId]);
    res.redirect("/discover");
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/community/add_user_to_events",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "INSERT INTO users_to_events (userID, eventID) VALUES ($1, $2) returning *";
    await db.one(query, [user1, req.body.eventid]);
    res.redirect("/community/" + req.body.communityid)
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/community/remove_user_event",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "DELETE FROM users_to_events WHERE userID = $1 AND eventID =$2 returning *";
    await db.one(query, [user1,req.body.eventid]);
    res.redirect("/community/" + req.body.communityid)
  }
  catch (error) {
    console.error("Error: " + error);
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
    try {
      res.render("pages/profile", {
        data: await loadProfile(req.session.user),
      });
    } catch (error) {
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
  try {
    const profile = req.params.friendID;
    const p = "SELECT * FROM users WHERE userID = $1";
    const { rows } = await pool.query(p, [profile]);
    console.log(rows[0]);
    res.render("pages/friendProfile", {
      data: await loadProfile(rows[0]),
    });
  } catch (error) {
    console.error("Error in /profile route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/friends", async (req, res) => {
  if(req.session.user == undefined){
    res.render("pages/login",{
      message: "Log in to view your friends",
      error: "danger"
    });
  }
  else{
    try{
      const myEvents = await db.any("SELECT * FROM users_to_events WHERE userID = $1", [
        req.session.user.userid,
       ]);
       const allUsers = await db.any("SELECT * FROM users WHERE userID != $1", [
        req.session.user.userid,
       ]);
      const friends = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1", [
       req.session.user.userid, 
      ]);
      var all_users = [];
      var hold = 0;
      for(i = 0; i < allUsers.length; i++){
        var add = true;
        for(j=0; j < friends.length; j++){
          if(friends[j].useridb == allUsers[i].userid){
            add = false;
          }
        }
        if(add == true){
          all_users[hold] = allUsers[i];
          hold = hold + 1;
        }
      }
      if(!friends){
        res.render("pages/friends", {
          user: "empty",
          friend: "no friends",
          community: "empty",
          empty: " ",
          events: "no events",
          allUsers: all_users,
        });
      }
      const community = {
        name: undefined,
        desciption: undefined,
        communityid: undefined,
      };
      var status = 'friends';
      const friends_check = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1 AND friends.status = $2", [
        req.session.user.userid, status,
       ]);
      const find_communities = [];
      var index = 0;
      const result = 'SELECT * FROM users_to_communities JOIN communities ON users_to_communities.communityID = communities.communityID WHERE users_to_communities.userID = $1';
      for(i = 0; i < friends_check.length; i++){
        const friend_community = await db.query(result, [friends_check[i].useridb,]);
        for(j=0; j < friend_community.length; j++){
          const community = {
            name: friend_community[j].name,
            desciption: friend_community[j].description,
            communityid: friend_community[j].communityid,
          };
          var exists = false;
          for(n=0; n < find_communities.length; n++){
            if(find_communities[n].communityid == friend_community[j].communityid){
              exists = true;
            }
          }
          if(exists == false){
            find_communities[index] = community;
            index = index + 1;
          }
        }
      }
      const find_events = [];
      var index1 = 0;
      const result2 = 'SELECT * FROM users_to_events JOIN events ON users_to_events.eventID = events.id WHERE users_to_events.userID = $1';
      for(i = 0; i < friends_check.length; i++){
        const friend_event = await db.query(result2, [friends_check[i].useridb,]);
        for(j=0; j < friend_event.length; j++){
          var status = "false"
          for(n=0; n < myEvents.length; n++){
            if(myEvents[n].eventid == friend_event[j].eventid){
              status = "true";
            }
          }
          const events = {
            title: friend_event[j].title,
            start: friend_event[j].start,
            end: friend_event[j].end,
            extendedProps: {
              location: friend_event[j].description,
              eventID: friend_event[j].id,
              status: status,
            },
          };
          var exists = false;
          for(n=0; n < find_events.length; n++){
            if(find_events[n].extendedProps.eventID == friend_event[j].id){
              exists = true;
            }
          }
          if(exists == false){
            find_events[index1] = events;
            index1 = index1 + 1;
          }
        }
      }
        res.render("pages/friends", {
          user: "empty",
          friend: friends,
          community: find_communities,
          empty: " ",
          events: find_events,
          allUsers: all_users,
        });
    }
    catch (error) {
      console.error("Error: " + error);
    }
  }
});

app.post("/user_search", async (req, res) =>{
  try{
      const myEvents = await db.any("SELECT * FROM users_to_events WHERE userID = $1", [
        req.session.user.userid,
      ]);
      const allUsers = await db.any("SELECT * FROM users WHERE userID != $1", [
        req.session.user.userid,
       ]);
      const friends = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1", [
       req.session.user.userid, 
      ]);
      var all_users = [];
      var hold = 0;
      for(i = 0; i < allUsers.length; i++){
        var add = true;
        for(j=0; j < friends.length; j++){
          if(friends[j].useridb == allUsers[i].userid){
            add = false;
          }
        }
        if(add == true){
          all_users[hold] = allUsers[i];
          hold = hold + 1;
        }
      }

      const community = {
        name: undefined,
        desciption: undefined,
        communityid: undefined,
      };
      var status = 'friends';
      const friends_check = await db.any("SELECT * FROM friends JOIN users ON friends.userIDB = users.userID WHERE friends.userIDA = $1 AND friends.status = $2", [
        req.session.user.userid, status,
       ]);
      const find_communities = [];
      var index = 0;
      const result = 'SELECT * FROM users_to_communities JOIN communities ON users_to_communities.communityID = communities.communityID WHERE users_to_communities.userID = $1';
      for(i = 0; i < friends_check.length; i++){
        const friend_community = await db.query(result, [friends_check[i].useridb,]);
        for(j=0; j < friend_community.length; j++){
          const community = {
            name: friend_community[j].name,
            desciption: friend_community[j].description,
            communityid: friend_community[j].communityid,
          };
          var exists = false;
          for(n=0; n < find_communities.length; n++){
            if(find_communities[n].communityid == friend_community[j].communityid){
              exists = true;
            }
          }
          if(exists == false){
            find_communities[index] = community;
            index = index + 1;
          }
        }
      }

      const find_events = [];
      var index1 = 0;
      const result2 = 'SELECT * FROM users_to_events JOIN events ON users_to_events.eventID = events.id WHERE users_to_events.userID = $1';
      for(i = 0; i < friends_check.length; i++){
        const friend_event = await db.query(result2, [friends_check[i].useridb,]);
        for(j=0; j < friend_event.length; j++){
          var status = "false"
          for(n=0; n < myEvents.length; n++){
            if(myEvents[n].eventid == friend_event[j].eventid){
              status = "true";
            }
          }
          const events = {
            title: friend_event[j].title,
            start: friend_event[j].start,
            end: friend_event[j].end,
            extendedProps: {
              location: friend_event[j].description,
              eventID: friend_event[j].id,
              status: status,
            },
          };
          var exists = false;
          for(n=0; n < find_events.length; n++){
            if(find_events[n].extendedProps.eventID == friend_event[j].id){
              exists = true;
            }
          }
          if(exists == false){
            find_events[index1] = events;
            index1 = index1 + 1;
          }
        }
      }
    const users = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
      req.body.user,
    ]);
    if(!users || req.body.user == req.session.user.username){
      res.render("pages/friends", {
        user: "NOT_FOUND",
        friend: friends,
        community: find_communities,
        empty: " ",
        events: find_events,
        allUsers: all_users,
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
            else if(friends[i].status == "pending"){
              friend = "pending";
            }
            else{
              friend = "sent";
            }
          }
        }
        res.render("pages/friends", {
          user: users,
          friend: friends,
          community: find_communities,
          empty: friend,
          events: find_events,
          allUsers: all_users,
        });
      }
      else{
        res.render("pages/friends", {
          user: "empty",
          friend: friends,
          community: find_communities,
          empty: " ",
          events: find_events,
          allUsers: all_users,
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

app.post("/add_user_to_events",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "INSERT INTO users_to_events (userID, eventID) VALUES ($1, $2) returning *";
    await db.one(query, [user1, req.body.eventid]);
    res.redirect("/friends")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/remove_user_event",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "DELETE FROM users_to_events WHERE userID = $1 AND eventID =$2 returning *";
    await db.one(query, [user1,req.body.eventid]);
    res.redirect("/friends")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/add_user_to_events2",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "INSERT INTO users_to_events (userID, eventID) VALUES ($1, $2) returning *";
    await db.one(query, [user1, req.body.eventid]);
    res.redirect("/")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/remove_user_event2",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "DELETE FROM users_to_events WHERE userID = $1 AND eventID =$2 returning *";
    await db.one(query, [user1,req.body.eventid]);
    res.redirect("/")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.post("/test",async (req, res) =>{
    res.redirect("/friends")
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
  if(req.session.user == undefined){
    res.render("pages/login",{
      message: "Log in to view the discover page",
      error: "danger"
    });
  }
  else{
    try {
      console.log("testing");
      const allCommunitiesQuery = `SELECT * FROM communities`;
      const userCommunitiesQuery = `SELECT * FROM users_to_communities WHERE userID = $1`;
      const userEventsQuery = `SELECT * FROM users_to_events WHERE userID = $1`;
      // const allEventsQuery = `SELECT * FROM events`;
      const allEventsQuery = `SELECT  e.id,  e.title,  e.description,  e.start,  e.end,  c.name AS community_name FROM events e JOIN  communities_to_events cte ON e.id = cte.eventID JOIN  communities c ON cte.communityID = c.communityID;`;
      // Fetch data from the database
      const communities1 = await db.any(allCommunitiesQuery);
      const events1 = await db.any(allEventsQuery);
      const userCommunities = await db.any(userCommunitiesQuery,[req.session.user.userid]);
      const userEvents = await db.any(userEventsQuery,[req.session.user.userid]);
  
      var communities = [];
      for(i = 0; i < communities1.length; i++){
        var status = "join";
        for(j = 0; j < userCommunities.length; j++){
          if(userCommunities[j].communityid == communities1[i].communityid){
            status = "leave";
          }
        }
        const community = {
          communityid: communities1[i].communityid,
          name:communities1[i].name,
          description: communities1[i].description,
          filters: communities1[i].filters,
          adminUserID: communities1[i].adminUserid,
          status: status,
        }
        communities[i] = community;
      }

      var events = [];
      for(i = 0; i < events1.length; i++){
        var status = "join";
        for(j = 0; j < userEvents.length; j++){
          if(userEvents[j].eventid == events1[i].id){
            status = "leave";
          }
        }
        const event = {
          id: events1[i].id,
          title: events1[i].title,
          description:events1[i].description,
          start: events1[i].start,
          end: events1[i].end,
          status: status,
        }
        events[i] = event;
      }
      console.log(events);
      console.log(userEvents);
      // console.log(communities, events);
      // Render the EJS template with the retrieved data
      res.render("pages/Discover", {
        allCommunities: communities,
        allEvents: events,
      });
    } catch (error) {
      console.error("Error in /discover route:", error);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.get("/filter/:type", async (req, res) => {
  console.log("testing2");
  const filter = req.params.type;
  try {
    const filteredCommunities = `SELECT * FROM communities WHERE filters = $1`;
    const allEventsQuery = `SELECT * FROM events`;
    const userCommunitiesQuery = `SELECT * FROM users_to_communities WHERE userID = $1`;
    const userEventsQuery = `SELECT * FROM users_to_events WHERE userID = $1`;
    // Fetch data from the database
    const communities1 = await db.query(filteredCommunities, [filter]);
    const events1 = await db.query(allEventsQuery);
    const userCommunities = await db.any(userCommunitiesQuery,[req.session.user.userid]);
    const userEvents = await db.any(userEventsQuery,[req.session.user.userid]);

    var communities = [];
      for(i = 0; i < communities1.length; i++){
        var status = "join";
        for(j = 0; j < userCommunities.length; j++){
          if(userCommunities[j].communityid == communities1[i].communityid){
            status = "leave";
          }
        }
        const community = {
          communityid: communities1[i].communityid,
          name:communities1[i].name,
          description: communities1[i].description,
          filters: communities1[i].filters,
          adminUserID: communities1[i].adminUserid,
          status: status,
        }
        communities[i] = community;
      }

      var events = [];
      for(i = 0; i < events1.length; i++){
        var status = "join";
        for(j = 0; j < userEvents.length; j++){
          if(userEvents[j].eventid == events1[i].id){
            status = "leave";
          }
        }
        const event = {
          id: events1[i].id,
          title: events1[i].title,
          description:events1[i].description,
          start: events1[i].start,
          end: events1[i].end,
          status: status,
        }
        events[i] = event;
      }

    // console.log(communities, events);
    console.log("communities:", communities);
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
  const userId = req.session.user.userid;
  const query = `INSERT INTO users_to_communities (userID, communityID) VALUES ($1, $2)`;
  const communityMembersQuery = `
      SELECT users.fullName, users.username
      FROM users
      JOIN users_to_communities ON users.userID = users_to_communities.userID
      WHERE users_to_communities.communityID = $1`;
  try {
    const members = await db.manyOrNone(communityMembersQuery, [communityId]);
    var member = "false"
    for(i = 0; i < members.length; i++){
      if(members[i].username == req.session.user.username){
        member = "true";
      }
    }
    if(member == "false"){
      await db.query(query, [userId, communityId]);
    }

    setTimeout(() => {
      res.redirect("/discover");
    }, 2000);
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
    }, 2000); // 2000 milliseconds (2 seconds)
    // res.redirect("/discover");
  } catch (error) {
    console.log("error:", error);
    console.error("Error in /addUserToEvent route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/remove_user_event3",async (req, res) =>{
  const user1 = req.session.user.userid;
  try{
    const query = "DELETE FROM users_to_events WHERE userID = $1 AND eventID =$2 returning *";
    await db.one(query, [user1,req.body.eventid]);
    res.redirect("/discover")
  }
  catch (error) {
    console.error("Error: " + error);
  }
});

app.get("/create", (req, res) => {
  if (req.session.user == undefined) {
    res.render("pages/login", {
      message: "Please Login to Create a Community",
      error: "danger",
    });
  } else {
    res.render("pages/create");
  }
});


app.get("/createEvent/:communityID", (req, res) => {
  const communityID = req.params.communityID;
  if(req.session.user == undefined){
    res.render("pages/login", { message: "Please Login to Create an Event", error: "danger"});  
  }
    else {
  res.render("pages/createEvent", {communityID});
    }
})

app.post("/createEvent/:communityID", async (req, res) => {
  const communityID = req.params.communityID;

  if (req.session.user == undefined) {
    res.render("pages/login", {
      message: "Please Login to Create an Event",
      error: "danger",
    });
  } else {
    // TODO: Check if current user is admin for community id, otherwise deny request
    
    let {title, description, start, end } = req.body;

    // For some reason it is not auto-incrementing the eventid, so let us fetch the last eventid and increment it by 1
    const lastEventQuery = `SELECT id FROM events ORDER BY id DESC LIMIT 1`;
    const lastEvent = await db.one(lastEventQuery);
    const eventid = lastEvent.id + 1;

    query = `INSERT INTO events (title, description, start, "end", id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    console.log(eventid, "b")

    try {
      const newEvent = await db.one(query, [title, description, start, end, eventid]);
      const ogEventID = newEvent.id;
      const eventID = ogEventID;
      const communitytoeventquery = `select communitytoeventid FROM communities_to_events ORDER BY communitytoeventid DESC LIMIT 1`;
      const lastCommunityToEvent = await db.one(communitytoeventquery);
      const communitytoeventid = lastCommunityToEvent.communitytoeventid + 1;
      const query2 = `INSERT INTO communities_to_events (communityID, eventID, communitytoeventid) VALUES ($1, $2, $3) RETURNING *`;
      await db.one(query2, [communityID, eventID, communitytoeventid]);
      // insert event id into users_to_events
      const query3 = `INSERT INTO users_to_events (userID, eventID) VALUES ($1, $2) RETURNING *`;
      await db.one(query3, [req.session.user.userid, eventID]);
      res.redirect("/discover");
    } catch (error) {
      console.error("Error: " + error);
    }
  }
})


app.get('/preview-community', (req, res) => {

  const { name, description, filters } = req.query;
  // Split the filters string into an array if it's not empty
  const filtersArray = filters ? filters.split(",") : [];
  res.render("pages/previewCommunity", {
    name,
    description,
    filters: filtersArray,
  });
});

app.post("/create-community", async (req, res) => {
  try {
    const { name, description, filters } = req.body;
    const userID = req.session.user.userid;

    //check for existing communities
    const existingCommunity = await db.query(
      "SELECT * FROM communities WHERE name = $1",
      [name]
    );

    if (existingCommunity.length > 0) {
      return res.render("pages/create", {
        message: "Community already exists!",
        error: "danger",
      });
    }

    const filtersString = Array.isArray(filters) ? filters.join(",") : "";

    const communityIDQuery = `SELECT communityid FROM communities ORDER BY communityid DESC LIMIT 1`
    const ourCommunityID = await db.one(communityIDQuery);
    console.log(ourCommunityID.communityid + 1)

    const newCommunity = await db.query(
      "INSERT INTO communities (communityID, name, description, filters, adminUserID) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [ourCommunityID.communityid + 1 ,name, description, filtersString, userID]
    );

    console.log(newCommunity);

    // joins automatically

    const communityID = newCommunity[0].communityid;

    await db.query(
      "INSERT INTO users_to_communities (userID, communityID) VALUES($1, $2)",
      [userID, communityID]
    );

    res.render("pages/create", { message: "Community created successfully!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
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
  

app.get("/discover", async (req, res) => {
    try {
      const allCommunitiesQuery = `SELECT * FROM communities`;
      const allEventsQuery = `SELECT e.id, e.title, e.description,  e.start,  e.end, c.name AS community_name FROM events e JOIN  communities_to_events cte ON e.id = cte.eventID JOIN  communities c ON cte.communityID = c.communityID;`;
      // Fetch data from the database
      const communities = await db.any(allCommunitiesQuery);
      const events = await db.any(allEventsQuery);
      // console.log(communities, events);
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

app.get("/filter/:type", async (req, res) => {
  console.log("testing2")
  const filter = req.params.type;
    try {
      const filteredCommunities = `SELECT * FROM communities WHERE filters = $1`;
      const allEventsQuery = `SELECT * FROM events`;
      // Fetch data from the database
      const communities = await db.query(filteredCommunities,[filter]);
      const events = await db.query(allEventsQuery);
      // console.log(communities, events);
      console.log("communities:", communities);
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
    // console.log("success");

    setTimeout(() => {
      res.redirect("/discover");
    }, 2000);
  
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
    }, 2000); // 2000 milliseconds (2 seconds)
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

app.get("/createEvent/:communityID", (req, res) => {
  const communityID = req.params.communityID;
  if(req.session.user == undefined){
    res.render("pages/login", { message: "Please Login to Create an Event", error: "danger"});  
  }
    else {
  res.render("pages/createEvent", {communityID});
    }
})

app.post("/createEvent/:communityID", async (req, res) => {
  const communityID = req.params.communityID;

  if (req.session.user == undefined) {
    res.render("pages/login", {
      message: "Please Login to Create an Event",
      error: "danger",
    });
  } else {
    // TODO: Check if current user is admin for community id, otherwise deny request
    
    let {title, description, start, end } = req.body;

    // For some reason it is not auto-incrementing the eventid, so let us fetch the last eventid and increment it by 1
    const lastEventQuery = `SELECT id FROM events ORDER BY id DESC LIMIT 1`;
    const lastEvent = await db.one(lastEventQuery);
    let eventid = lastEvent.id + 1;

    query = `INSERT INTO events (title, description, start, "end", id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    console.log(eventid, "b")

    try {
      let originalEventID = eventid;
      const newEvent = await db.one(query, [title, description, start, end, eventid]);
      //const eventID = newEvent.eventid;
      let eventID = originalEventID;
      const communitytoeventquery = `select communitytoeventid FROM communities_to_events ORDER BY communitytoeventid DESC LIMIT 1`;
      const lastCommunityToEvent = await db.one(communitytoeventquery);
      const communitytoeventid = lastCommunityToEvent.communitytoeventid + 1;
      const query2 = `INSERT INTO communities_to_events (communityID, eventID, communitytoeventid) VALUES ($1, $2, $3) RETURNING *`;
      await db.one(query2, [communityID, eventID, communitytoeventid]);
      // insert event id into users_to_events
      const query3 = `INSERT INTO users_to_events (userID, eventID) VALUES ($1, $2) RETURNING *`;
      await db.one(query3, [req.session.user.userid, eventID]);
      console.log("Created event successfully")
      res.redirect("/discover");
    } catch (error) {
      console.error("Error: " + error);
    }
  }
})


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

   if (existingCommunity.length > 0) {
      return res.render('pages/create', { message: 'Community already exists!', error: 'danger' });
    }


    const filtersString = Array.isArray(filters) ? filters.join(',') : '';

    let communitiesIDQuery = 'Select * from communities order by communityid desc limit 1';
    const communitiesID = await db.query(communitiesIDQuery);


    
    const newCommunity = await db.query(
      "INSERT INTO communities (communityID, name, description, filters, adminUserID) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [communitiesID[0].communityid + 1, name, description, filtersString, userID]
    );

    console.log(newCommunity);

// joins automatically

      const communityID = newCommunity[0].communityid;

      await db.query(
        "INSERT INTO users_to_communities (userID, communityID) VALUES($1, $2)",
        [userID, communityID]
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
