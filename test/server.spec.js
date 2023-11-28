// Imports the index.js file to be tested.
const server = require("../index"); //TO-DO Make sure the path to your index.js is correctly added
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require("chai");
const chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

describe("Server!", () => {
  // Sample test case given to test / endpoint.
  it("Returns the default welcome message", (done) => {
    chai
      .request(server)
      .get("/welcome")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals("success");
        assert.strictEqual(res.body.message, "Welcome!");
        done();
      });
  });

  // ===========================================================================
  // TO-DO: Part A Login unit test case


  //Positive Test case

  it("Positive : /login", (done) => {
    chai
      .request(server)
      .post("/login")
      .send({ username: "luke", password: "password"})
      .end((err, res) => {
        expect(res).to.have.status(200); 
        expect(res.text).to.include('Successfully logged in');
        done();
      });
  });

  // Negative Test case

  it("negative: /login", (done) => {
    chai
      .request(server)
      .post("/login")
      .send({ username: "luke", password: "12345" })
      .end((err, res) => {
        expect(res).to.have.status(200); 
        expect(res.text).to.include('Incorrect password');
        done();
      });
  });
  
  it("Positive : /register", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({ fullName: "John Doe", email: "john1@gmail.com", username: "john_doe2", password: "123"})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.include('Successfully registered');
        done();
      });
  });

  it("Negative : /register", (done) => {
    chai
      .request(server)
      .post("/register")
      .send({ fullName: "John Doe", email: "john@example.com", username: "john_doe33", password: "123"})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.text).to.include('Email already exists. Please Log in');
        done();
      });
  });






});
