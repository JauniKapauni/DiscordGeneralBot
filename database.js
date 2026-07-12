const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./polls.db');
db.serialize(() => {
	db.run('CREATE TABLE IF NOT EXISTS polls (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT, question TEXT, option1 TEXT, option2 TEXT, end_time INTEGER)');
	db.run('CREATE TABLE IF NOT EXISTS poll_votes (poll_id INTEGER, user_id TEXT, option TEXT, UNIQUE(poll_id, user_id))');
});
module.exports = db;