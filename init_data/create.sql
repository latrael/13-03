 CREATE TABLE users (
    userID SERIAL PRIMARY KEY,
    fullName VARCHAR(40),
    username VARCHAR(40),
    password CHAR(60),
    email VARCHAR(40)
);

CREATE TABLE friends (
    friendshipID SERIAL PRIMARY KEY,
    userIDA INTEGER,
    userIDB INTEGER,
    status VARCHAR(40),
    FOREIGN KEY (userIDA) REFERENCES users(userID),
    FOREIGN KEY (userIDB) REFERENCES users(userID)
);

CREATE TABLE communities (
    communityID SERIAL PRIMARY KEY,
    name VARCHAR(40),
    description VARCHAR(5000),
    filters VARCHAR(250),
    adminUserID INTEGER,
    FOREIGN KEY (adminUserID) REFERENCES users(userID)
);

CREATE TABLE users_to_communities (
    userID INTEGER,
    communityID INTEGER,
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (communityID) REFERENCES communities(communityID)
);

CREATE TABLE events (
    eventID SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    date VARCHAR(100), --2002-04-20 17:31:12.66 for timestamp 
    location TEXT
);

CREATE TABLE users_to_events (
    userID INTEGER,
    eventID INTEGER,
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (eventID) REFERENCES events(eventID)
);

CREATE TABLE communities_to_events (
    communityToEventID SERIAL PRIMARY KEY,
    communityID INTEGER,
    eventID INTEGER,
    FOREIGN KEY (communityID) REFERENCES communities(communityID),
    FOREIGN KEY (eventID) REFERENCES events(eventID)
); 