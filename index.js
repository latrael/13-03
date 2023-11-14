// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs'); // set the view engine to EJS
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

app.get('/', (req, res) => {
  res.render('pages/home');
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// <!-- Luke - Added API routes for register, login, logout, profile-->

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post('/register', async (req, res) => {
  try {
    //hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);

    const email_exists = await db.oneOrNone(('SELECT * FROM users WHERE email = $1'), [req.body.email]);
    const user_exists = await db.oneOrNone(('SELECT * FROM users WHERE username = $1'), [req.body.username]);

    if(email_exists){
      res.render('pages/login', {message: 'Email already exists. Please Log in', error: 'danger'});
      //return res.status(401).json({ error: 'User already exists.' });
    }
    else if(user_exists){
      res.render('pages/register', {message: 'Username already exists. Enter alternate username', error: 'danger'});
    }
    else{
      const query = 'INSERT INTO users (fullName, email, username, password) VALUES ($1, $2, $3, $4)';
      await db.query(query, [req.body.fullName, req.body.email, req.body.username, hash]);
      //res.status(201).json({ message: 'User registered successfully.' });
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error while registering user: ' + error);
    res.status(500).json({ error: 'An error occurred while registering the user.' });
  }

});

app.get('/login', (req, res) => {
  if(req.session.user == undefined){
    res.render('pages/login');
  }
  else{
    res.render('pages/profile', {data: req.session.user, message: 'Already logged in'});
  }
  
});

app.post('/login', async (req, res) => {

  const username = req.body.username;
  const password = req.body.password;
  try{
    const user = await db.oneOrNone(('SELECT * FROM users WHERE username = $1'), [req.body.username]);

    if(!user){
      res.render('pages/login', {message: 'User not found', error: 'danger'});
    }

    const match = await bcrypt.compare(password, user.password);
    console.log(password);
    console.log(user.password);
    console.log(match);
    if(match == false){
      console.log('incorrect password');
      res.render('pages/login', {message: 'Incorrect password', error: 'danger'});
    }
    else{
      req.session.user = user;
      req.session.save();
      console.log(req.session);
      res.render('pages/profile', {data: req.session.user, message: 'Successfully logged in'});
    }
  } catch(error){
    console.error('Error: ' + error);
  }
  

});

app.get('/logout', function(req, res) {
  req.session.user = null;
  console.log(req.session);
  res.render('pages/login', {message: 'Successfully logged out'});
});

app.get('/profile', (req, res) => {
  console.log(req.session.user);
  if(req.session.user == undefined){
    res.render('pages/login', {message: 'Log in to view profile', error: 'danger'});
  }
  else{
    res.render('pages/profile', {data: req.session.user});
  }
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');