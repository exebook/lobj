var db = require('./lobj').open('data', { saveOnExit: false })
if (db) {
	console.log(db)
	db.close()
}