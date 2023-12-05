INSERT INTO users (userID, fullName, username, password, email) VALUES
  (91, 'Luke Campbell', 'luke', '$2a$12$XSHJPtIFcTQi4Qlbb5ov/O2I9nfeUNtOEjf3fwlYvpBmRhUG5pcxq', 'luke@gmail.com'),
  (92, 'John Doe', 'john_doe', '$2a$10$kZW6xd2Vxc2ueuChmT4BLetTs1u99DiAWldsKS/DPxexHgzDRP76S','john@example.com'),
  (93, 'Jane Doe', 'jane_doe', '$2a$10$kZW6xd2Vxc2ueuChmT4BLetTs1u99DiAWldsKS/DPxexHgzDRP76S','jane@example.com'),
  (94, 'Bob Smith', 'bob_smith', '$2a$10$kZW6xd2Vxc2ueuChmT4BLetTs1u99DiAWldsKS/DPxexHgzDRP76S','bob@example.com'),
  (95, 'Test', 'testing', '$2b$10$/dt5ujF.HnwpJ7Cob4rUo.BnzLomXUsb7i8VmG8jA1rmeMrvsZqfm','testing@colorado.edu'),
  (96, 'Jacob Stiegler', 'jacob406', '$2b$10$/dt5ujF.HnwpJ7Cob4rUo.BnzLomXUsb7i8VmG8jA1rmeMrvsZqfm','jast5595@colorado.edu');

INSERT into communities (name, description) VALUES 
('Adobe Creative Club', 'This is a place for design and learning the art of Adobe softwares. Sharing knowledge and experience around campus about Adobe software and connecting with students to better skills.'),
('African Student Association', 'Our organization brings African and black-identifying people together on campus since there is such a small percentage of us on campus'),
('Alpha Chi Omega', 'At Alpha Chi Omega, we''re about finding and shaping real, strong women. That''s been our slogan since our re-branding in 2008, but it''s been our reality since 1885. Being an Alpha Chi means being a part of an organization that allows individuals to be themselves, allows them to learn how to make the most of their life, and allows them to realize their greatest potential. It means every individual receives the encouragement, inspiration, fun, and friendship of 200,000 other real, strong women at their side. It means that she gets a four-year collegiate learning and leadership program that supplements and complements what she''ll get from her college or university. It means she''ll have opportunities for a lifetime, leadership, and engagement with real, strong women who are making a difference for themselves, their fellow members, and the communities around them.'),
('Alpha Epsilon Delta', 'Established in 1926 at the University of Alabama, Alpha Epsilon Delta, the National Pre-Medical Honor Society, has since become the world''s largest body dedicated to pre-medical education, with a membership exceeding 100,000 in 166 chapters.Here at Boulder, we meet every other Sunday (online this semester) at 6:00 PM. New members come a bit earlier at 5:30 PM.The University of Colorado at Boulder was chartered on March 22, 1934 and became the 11th chapter of Alpha Epsilon Delta''s legacy. Over the years, the organization has united students that share a passion for the health sciences. Despite differences in professional interests, all members of AED have a strong commitment to academic achievement pursuit of knowledge...');

INSERT INTO events (id, title, description, start, "end") VALUES
(1, 'Take A Closer Look', 'Take A Closer Look features an intimate and elegant collection of curated items that explores specimens and objects from the CU Museum. Each item is actively and currently used by researchers to learn more about the natural world and the humans who share this planet. The exhibition features specimens that represent the ancient world to present day and includes some never-before-seen items from our collections. Main floor.', '2023-11-16T12:00:00', '2023-11-16T14:00:00'),
(2, 'Staff Council Blood Drive & Community Service Committee Meeting', 'Boulder Campus Staff Council has been hosting blood drives since 1973. Since this partnership began, the CU Boulder campus community has saved or enhanced over 106,000 lives! We love working with many CU and community partners like Vitalant, CU''s Mobile Food Pantry and Coats for Colorado.', '2023-12-21T10:00:00', '2023-12-21T11:00:00'),
(3, 'Venture Partners & CU Boulder Postdoc Startups', 'The Office of Postdoctoral Affairs, Postdoctoral Association of Colorado Boulder and Venture Partners invite postdocs to learn about startup and entrepreneurship resources to: Leverage their intellectual property; Start a company on campus; Generate a licensing deal; Assess product-market fit; Develop successful commercialization strategies; Generate options for increasing their technology''s impact outside of the lab; and Win grant funding up to $125K for research projects with commercial potential!', '2023-11-16T12:00:00', '2023-11-16T13:00:00'),
(4, 'Zen Meditation', 'Interested in learning to meditate? Looking to unwind at the end of a busy day? Already have a practice and hoping to find others who share your passion for zazen? For CU students, staff, and faculty, come learn about the way of Zen. Get to know your true self. We will sit for 20 minutes, then have a brief discussion about Zen practice and how we can improve our sense of wellbeing and balance by meditating.
Each Thursday this semester, meditation will be led by Dr. Sigman Myoshin Byrd, professor in the Program for Writing and Rhetoric, a 14-year zazen practitioner, member of the Eon Zen Center in Boulder and student of Sensei Paul Gyodo Agostinelli.', '2023-11-16T18:00:00', '2023-11-16T19:00:00');

INSERT INTO friends(userIDA, userIDB, status) VALUES
(91, 92, 'friends'),
(92, 91, 'friends'),
(91, 93, 'friends'),
(93, 91, 'friends'),
(92, 96, 'friends'),
(96, 92, 'friends'),
(96, 93, 'friends'),
(93, 96, 'friends'),
(95, 96, 'sent'),
(96, 95, 'pending'),
(96, 94, 'sent'),
(94, 96, 'pending');

INSERT INTO users_to_communities(userID, communityID) VALUES
(91,1),
(91,2),
(91,3),
(91,4),
(93,3),
(95,4);

INSERT INTO users_to_events(userID, eventID) VALUES
(91, 1),
(91, 2),
(93, 1),
(93, 2),
(93, 3),
(93, 4);

INSERT INTO communities_to_events(communityToEventID, communityID, eventID) VALUES
(1, 1, 1),
(2, 2, 2),
(3, 3, 3),
(4, 4, 4);