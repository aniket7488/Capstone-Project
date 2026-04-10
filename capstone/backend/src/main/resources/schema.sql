-- =============================================================
-- Quiz-Cap: AI-Driven Offline-First Digital Learning Platform
-- MySQL Schema v1.0
-- Run this file once against your MySQL server before starting
-- the Spring Boot backend.
-- =============================================================

--CREATE DATABASE IF NOT EXISTS quizcap_db
--    CHARACTER SET utf8mb4
--    COLLATE utf8mb4_unicode_ci;
--
--USE quizcap_db;

-- ---------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    email      VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,          -- BCrypt hashed, never plain-text
    role       ENUM('STUDENT','TEACHER','ADMIN') NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 2. COURSES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id            BIGINT        AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(200)  NOT NULL,
    description   TEXT,
    thumbnail_url VARCHAR(500),
    created_by    BIGINT        NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------
-- 3. LESSONS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
    id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
    course_id  BIGINT       NOT NULL,
    title      VARCHAR(200) NOT NULL,
    content    LONGTEXT     NOT NULL,   -- Markdown or plain HTML
    position   INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lesson_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 4. QUIZZES  (one row per question)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    lesson_id   BIGINT       NOT NULL,
    question    TEXT         NOT NULL,
    option_a    VARCHAR(500) NOT NULL,
    option_b    VARCHAR(500) NOT NULL,
    option_c    VARCHAR(500),
    option_d    VARCHAR(500),
    correct_opt CHAR(1)      NOT NULL,   -- 'A' | 'B' | 'C' | 'D'  (NEVER exposed via API)
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 5. RESULTS  (one result per user per lesson — upsertable)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS results (
    id           BIGINT    AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT    NOT NULL,
    lesson_id    BIGINT    NOT NULL,
    score        INT       NOT NULL,
    max_score    INT       NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced       TINYINT(1) NOT NULL DEFAULT 1,  -- 1 = server record; client stores 0 for pending
    CONSTRAINT fk_result_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_result_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    -- Unique per user+lesson to allow idempotent upsert during offline sync
    CONSTRAINT uq_user_lesson UNIQUE (user_id, lesson_id)
);

-- ---------------------------------------------------------------
-- 6. CHATBOT_DATA  (FAQ store for offline rule-based chatbot)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_data (
    id       BIGINT        AUTO_INCREMENT PRIMARY KEY,
    keyword  VARCHAR(300)  NOT NULL,   -- comma-separated trigger words
    question VARCHAR(500)  NOT NULL,
    answer   TEXT          NOT NULL,
    category VARCHAR(100),
    INDEX idx_keyword (keyword(191))
);

-- ===============================================================
-- SEED DATA
-- ===============================================================

-- Admin user (password: Admin@123  →  BCrypt hash)
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@quizcap.com',
 '$2a$12$SXkZ9X4vBpqQa1kS8oPsXeVIe3fmECBLz7hSXz9b7u/WaJmMxWJOO',
 'ADMIN');

-- Teacher user (password: Teacher@123)
INSERT INTO users (username, email, password, role) VALUES
('teacher1', 'teacher1@quizcap.com',
 '$2a$12$SXkZ9X4vBpqQa1kS8oPsXeVIe3fmECBLz7hSXz9b7u/WaJmMxWJOO',
 'TEACHER');

-- Sample courses (created by teacher1, id=2)
INSERT INTO courses (title, description, thumbnail_url, created_by) VALUES
('Mathematics Fundamentals',
 'Build a strong foundation in arithmetic, algebra, and geometry.',
 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
 2),
('Basic Science',
 'Explore the wonders of physics, chemistry, and biology through simple experiments.',
 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=400',
 2),
('English Language Arts',
 'Improve reading, writing, grammar, and communication skills.',
 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
 2);

-- Lessons for Mathematics (course_id=1)
INSERT INTO lessons (course_id, title, content, position) VALUES
(1, 'Introduction to Fractions',
 '## What is a Fraction?\n\nA fraction represents a **part of a whole**.\n\nIt is written as:\n```\n  numerator\n  ---------\n denominator\n```\n\n### Examples\n- 1/2 means one part out of two equal parts.\n- 3/4 means three parts out of four equal parts.\n\n### Key Rules\n1. The denominator can never be zero.\n2. A **proper fraction** has numerator < denominator (e.g., 3/5).\n3. An **improper fraction** has numerator ≥ denominator (e.g., 7/4).',
 1),
(1, 'Addition and Subtraction of Fractions',
 '## Adding Fractions\n\n### Same Denominator\nSimply add the numerators:\n```\n1/5 + 2/5 = 3/5\n```\n\n### Different Denominators\n1. Find the **Least Common Denominator (LCD)**.\n2. Convert both fractions to equivalent fractions with the LCD.\n3. Add the numerators.\n\n**Example:**\n```\n1/3 + 1/4\nLCD = 12\n= 4/12 + 3/12\n= 7/12\n```',
 2);

-- Lessons for Basic Science (course_id=2)
INSERT INTO lessons (course_id, title, content, position) VALUES
(2, 'States of Matter',
 '## The Three States of Matter\n\nAll matter exists in one of these states:\n\n### 1. Solid\n- Fixed **shape** and **volume**\n- Particles are tightly packed and vibrate in place.\n- Example: Ice, Rock, Wood\n\n### 2. Liquid\n- Fixed **volume**, but takes the **shape of its container**\n- Particles can flow past each other.\n- Example: Water, Milk, Oil\n\n### 3. Gas\n- No fixed shape or volume\n- Particles move freely and fill any container.\n- Example: Oxygen, Water vapour, Carbon dioxide',
 1),
(2, 'The Water Cycle',
 '## How Does Water Move?\n\nThe water cycle describes how water moves continuously through our environment.\n\n### Stages\n1. **Evaporation** – Heat from the sun causes water in oceans and lakes to evaporate into water vapour.\n2. **Condensation** – As water vapour rises, it cools and forms tiny water droplets → clouds.\n3. **Precipitation** – Water falls back to earth as rain, snow, sleet, or hail.\n4. **Collection** – Water gathers in oceans, rivers, and lakes, and the cycle repeats.',
 2);

-- Lessons for English (course_id=3)
INSERT INTO lessons (course_id, title, content, position) VALUES
(3, 'Parts of Speech',
 '## The 8 Parts of Speech\n\n| Part of Speech | Definition | Example |\n|---|---|---|\n| Noun | Name of a person, place, or thing | *dog*, *school*, *India* |\n| Pronoun | Replaces a noun | *he*, *she*, *they* |\n| Verb | Action or state | *run*, *is*, *eat* |\n| Adjective | Describes a noun | *tall*, *red*, *happy* |\n| Adverb | Describes a verb/adjective | *quickly*, *very* |\n| Preposition | Shows relationship | *in*, *on*, *under* |\n| Conjunction | Joins words/clauses | *and*, *but*, *or* |\n| Interjection | Expresses emotion | *Oh!*, *Wow!* |',
 1);

-- Quizzes for Lesson 1 (Introduction to Fractions, lesson_id=1)
INSERT INTO quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_opt) VALUES
(1, 'What does the denominator of a fraction represent?',
 'The top number of the fraction',
 'The total number of equal parts the whole is divided into',
 'The number of parts selected',
 'The difference between parts',
 'B'),
(1, 'Which of the following is a proper fraction?',
 '7/4', '5/3', '3/5', '9/9',
 'C'),
(1, 'What is the value of 1/2 in decimal form?',
 '0.25', '1.2', '0.5', '2.0',
 'C');

-- Quizzes for Lesson 2 (Adding Fractions, lesson_id=2)
INSERT INTO quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_opt) VALUES
(2, 'What is 1/4 + 1/4?',
 '1/8', '2/4', '1/2', 'Both B and C',
 'D'),
(2, 'What is the LCD of 1/3 and 1/4?',
 '7', '12', '3', '4',
 'B'),
(2, 'What is 1/3 + 1/4?',
 '2/7', '7/12', '1/6', '2/12',
 'B');

-- Quizzes for Lesson 3 (States of Matter, lesson_id=3)
INSERT INTO quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_opt) VALUES
(3, 'Which state of matter has a fixed shape and volume?',
 'Gas', 'Liquid', 'Solid', 'Plasma',
 'C'),
(3, 'Water is an example of which state of matter at room temperature?',
 'Solid', 'Liquid', 'Gas', 'All of the above',
 'B'),
(3, 'What happens to particles in a gas?',
 'They are tightly packed and cannot move',
 'They flow past each other slowly',
 'They move freely and fill any container',
 'They vibrate in fixed positions',
 'C');

-- Quizzes for Lesson 4 (Water Cycle, lesson_id=4)
INSERT INTO quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_opt) VALUES
(4, 'What process causes water to turn into water vapour?',
 'Condensation', 'Precipitation', 'Evaporation', 'Collection',
 'C'),
(4, 'What forms when water vapour cools in the atmosphere?',
 'Rain', 'Ice', 'Clouds', 'Rivers',
 'C'),
(4, 'Which is NOT a form of precipitation?',
 'Rain', 'Snow', 'Hail', 'Evaporation',
 'D');

-- Quizzes for Lesson 5 (Parts of Speech, lesson_id=5)
INSERT INTO quizzes (lesson_id, question, option_a, option_b, option_c, option_d, correct_opt) VALUES
(5, 'In the sentence "The dog runs fast", what part of speech is "dog"?',
 'Verb', 'Adjective', 'Noun', 'Adverb',
 'C'),
(5, 'What part of speech is the word "quickly"?',
 'Noun', 'Verb', 'Adjective', 'Adverb',
 'D'),
(5, 'Which word is a conjunction?',
 'And', 'Run', 'Happy', 'Over',
 'A');

-- FAQ seed data for offline chatbot
INSERT INTO chatbot_data (keyword, question, answer, category) VALUES
('offline,sync,internet,connection',
 'How does offline sync work?',
 'The app saves your quiz results locally when you are offline. As soon as your internet connection is restored, it automatically syncs your saved results to the server. You will see a banner at the top when you are offline.',
 'Technical'),
('quiz,score,result,grade,marks',
 'How is my quiz score calculated?',
 'Each correct answer earns one point. Your final score is shown as correct answers out of total questions (e.g., 4/5) immediately after you submit the quiz.',
 'Quizzes'),
('password,reset,forgot,change',
 'How do I reset my password?',
 'Contact your teacher or school administrator to reset your password. Make sure to choose a strong password with letters, numbers, and symbols.',
 'Account'),
('course,enroll,start,begin,lesson',
 'How do I start a course?',
 'Go to the Courses page from the navigation menu. Click on any course card to see its lessons. Click on a lesson to read the content, then click "Take Quiz" to test your knowledge.',
 'Courses'),
('progress,history,result,performance',
 'How can I see my progress?',
 'Visit the Dashboard page. It shows your completed lessons, average score, and recent quiz results. Your progress is saved automatically, even when offline.',
 'Progress'),
('chatbot,ai,assistant,help',
 'How does the AI assistant work?',
 'When you are online, your question is sent to the server for an intelligent response. When offline, the chatbot uses a local FAQ database to answer common questions. Try asking about courses, quizzes, or how to use the platform.',
 'Technical'),
('register,signup,account,create',
 'How do I create an account?',
 'Click "Register" on the login page. Enter your username, email, and a strong password. After registration, you can log in and start learning immediately.',
 'Account'),
('teacher,admin,role,permission',
 'What is the difference between a student and teacher account?',
 'Students can view courses, take quizzes, and track their own progress. Teachers can create and manage courses and lessons. Contact your school admin to change your account role.',
 'Account'),

-- ── Educational FAQ entries ──────────────────────────────────────────────────

-- Mathematics
('fraction,fractions,numerator,denominator',
 'How do fractions work?',
 'A fraction represents a part of a whole. It has two parts: the numerator (top number) — how many parts you have, and the denominator (bottom number) — how many equal parts the whole is divided into. For example, 3/4 means 3 out of 4 equal parts. To add fractions with the same denominator, just add the numerators. For different denominators, find the Least Common Denominator (LCD) first.',
 'Mathematics'),

('add,adding,addition,subtract,subtracting,subtraction',
 'How do I add and subtract numbers?',
 'Addition means combining two or more numbers to get a total (sum). Example: 24 + 15 = 39. Subtraction means taking one number away from another to find the difference. Example: 40 - 13 = 27. Always line up the digits by place value (ones, tens, hundreds) when working vertically.',
 'Mathematics'),

('multiply,multiplication,times,product',
 'How does multiplication work?',
 'Multiplication is repeated addition. For example, 4 × 3 means adding 4 three times: 4 + 4 + 4 = 12. The result is called the product. A times table lists all products for a given number. Tips: anything × 0 = 0, anything × 1 = itself, swap the numbers (commutative): 3 × 5 = 5 × 3.',
 'Mathematics'),

('divide,division,quotient,remainder',
 'How does division work?',
 'Division splits a number into equal groups. For example, 12 ÷ 4 = 3 means 12 split into 4 equal groups gives 3 in each group. The answer is called the quotient. If it does not split evenly, the leftover is called the remainder. Example: 13 ÷ 4 = 3 remainder 1.',
 'Mathematics'),

('geometry,shape,area,perimeter,triangle,rectangle,circle',
 'What is area and perimeter?',
 'Perimeter is the total distance around the outside of a shape. Area is the space inside a shape. Formulas: Rectangle — Perimeter = 2×(length + width), Area = length × width. Triangle — Area = ½ × base × height. Circle — Area = π × radius², Circumference = 2 × π × radius. π (pi) ≈ 3.14.',
 'Mathematics'),

-- Science
('matter,solid,liquid,gas,state',
 'What are the states of matter?',
 'Matter exists in three main states: Solid — fixed shape and volume, particles tightly packed (e.g. ice, rock). Liquid — fixed volume but takes the shape of its container, particles flow (e.g. water, oil). Gas — no fixed shape or volume, particles move freely and fill any space (e.g. air, steam). Matter changes state through heating (melting, evaporation) or cooling (condensation, freezing).',
 'Science'),

('water,cycle,evaporation,condensation,precipitation,rain',
 'How does the water cycle work?',
 'The water cycle is how water moves continuously through our environment: 1. Evaporation — the sun heats water in oceans and lakes, turning it into water vapour that rises into the air. 2. Condensation — water vapour cools high in the atmosphere and forms clouds. 3. Precipitation — water falls as rain, snow, or hail. 4. Collection — water gathers in rivers, lakes, and oceans and the cycle repeats.',
 'Science'),

('photosynthesis,plant,sunlight,chlorophyll,oxygen',
 'What is photosynthesis?',
 'Photosynthesis is how plants make their own food using sunlight. The process: Carbon dioxide (from air) + Water (from soil) + Sunlight (energy) → Glucose (food) + Oxygen (released). This happens in the green parts of plants using a pigment called chlorophyll. Photosynthesis is vital — it produces the oxygen we breathe and forms the base of almost every food chain on Earth.',
 'Science'),

('cell,cells,nucleus,organism,biology',
 'What is a cell?',
 'A cell is the smallest unit of life. All living things are made of cells. Key parts: Nucleus — the control centre, contains DNA. Cell membrane — outer boundary, controls what enters and leaves. Cytoplasm — jelly-like fluid filling the cell. Plant cells also have a cell wall (for support) and chloroplasts (for photosynthesis). Animal cells do not have these.',
 'Science'),

('gravity,force,newton,weight,mass',
 'What is gravity?',
 'Gravity is a force that pulls objects towards each other. Earth''s gravity pulls everything downward toward its centre. Weight is the force of gravity acting on your mass — it changes on different planets. Mass is the amount of matter in an object — it stays the same everywhere. Sir Isaac Newton described gravity after observing a falling apple. The greater the mass, the stronger the gravitational pull.',
 'Science'),

-- English
('noun,verb,adjective,adverb,parts,speech,grammar',
 'What are the parts of speech?',
 'The 8 parts of speech are: Noun — name of a person, place, or thing (dog, school). Pronoun — replaces a noun (he, she, they). Verb — action or state (run, is, eat). Adjective — describes a noun (tall, red). Adverb — describes a verb or adjective (quickly, very). Preposition — shows relationship (in, on, under). Conjunction — joins words or clauses (and, but, or). Interjection — expresses emotion (Oh! Wow!).',
 'English'),

('sentence,paragraph,writing,essay,composition',
 'How do I write a good sentence?',
 'A good sentence must have: a Subject (who or what the sentence is about) and a Predicate (what the subject does or is). Example: "The student (subject) reads the book (predicate)." Tips: Start with a capital letter. End with a full stop, question mark, or exclamation mark. Keep it clear and focused on one idea. Vary sentence length — mix short and long sentences for better flow.',
 'English'),

('tense,past,present,future,verb',
 'What are verb tenses?',
 'Verb tenses tell us WHEN an action happens. Present tense — happening now: "She walks to school." Past tense — already happened: "She walked to school." Future tense — will happen: "She will walk to school." Continuous forms show ongoing actions: "She is walking" (present continuous). Always match the tense throughout your writing.',
 'English'),

-- General / Study skills
('study,learn,remember,memorize,tips,exam,test',
 'How can I study and learn better?',
 'Here are proven study tips: 1. Break study time into short sessions (25 min study, 5 min break — called Pomodoro technique). 2. Test yourself instead of just re-reading. 3. Teach the topic to someone else to solidify understanding. 4. Use diagrams, mind maps, and summaries. 5. Review notes within 24 hours of a lesson — this dramatically improves memory. 6. Get enough sleep — memory is consolidated during sleep. 7. Practice with past quiz questions.',
 'Study Skills'),

('concept,understand,explain,definition,meaning',
 'How do I understand difficult concepts?',
 'To understand a difficult concept: 1. Break it down into smaller parts. 2. Look for real-world examples you already know. 3. Draw a diagram or picture. 4. Write it in your own words. 5. Ask "why" and "how" questions about each part. 6. Connect it to something you already understand. 7. Practice applying it in different situations. If still stuck, the lesson content in your courses has detailed explanations — check the Courses page.',
 'Study Skills');
