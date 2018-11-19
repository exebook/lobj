/*
	TODO: store pid in lock, and erase the lock if the starter process is sure dead
*/

var fs = require('fs')
require('./throw-prev')

module.exports = {
	open
}

function open(dir, options) {
	if (options == undefined) options = {}
	check_dir(dir)
	if (is_locked(true) == true) {
		return
	}
	var db = {}, pwd = db
	var lock = 0

	load()
	fs.writeFileSync(dir + '/lock', `Database locked\nby: ${process.mainModule.filename}\nat ${new Date}`)
	init_methods()

	if (options.saveOnExit != false) {
		process.on('exit', x=>{
			if (options.saveOnExit != false) {
				save()
				close()
			}
		})
	}
	return db ;{
}

function add_method(method) {
	Object.defineProperty(db, method.name, { get: ()=>method, set: ()=>{
		throwPrev(new Error, 'cannot assign to a method db.'+method.name)
		halt()
	} })
}

function init_methods() {
	add_method(cd)
	add_method(use)
	add_method(cur)
	add_method(get)//sync
	add_method(set)
	add_method(del)
	add_method(add)
	add_method(save)
	add_method(burn)//sync
	add_method(close)
	add_method(schema)//sync
}

function close() {
	burn()
	fs.unlinkSync(dir + '/lock')
}

async function write_log(cmd, args) {
	var entry = cmd + JSON.stringify(args)
	
	return new Promise((ok, err)=>{
		lock++
		setImmediate(x=>{
			fs.appendFile(dir + '/log',  entry+'\n', e =>{
				lock--
				ok()
			})
		})
	})
}

async function cd(...args) {
	cd_log(...args)
	await write_log('c', args)
}

async function use(...args) {
	var f = args.pop()
	await cd(...args)
	await f(pwd)
	await cd()
}

function cur() {
	return pwd
}

function get(...args) {
	var old = pwd
	cd_log(...args)
	var ret = pwd
	pwd = old
	return ret
}

function cd_log(...args) {
	var cur
	if (args.length == 0) {
		cur = db
	}
	else {
		cur = pwd
		for (var i = 0; i < args.length; i++) {
			var next = args[i]
			if (typeof next == 'number' && next < 0) {
				next = cur.length + next
			}
			cur = cur[next]
			if (cur == undefined) {
				throwPrev(new Error, `path "${args.join('/')}" is null at ${args[i]}`, 3)
				halt()
			}
		}
	}
	pwd = cur
}

async function del(...args) {
	del_log(...args)
	await write_log('d', args)
}

function check_args(name, args, count) {
	if (args.length < count) {
		throwPrev(new Error, name + ' requires at least one argument')
		halt()
	}
}

function del_log(...args) {
	check_args('.del', args, 1)
	var cur = pwd
	var key = args[args.length - 1]

	for (var i = 0; i < args.length - 1; i++) {
		var next = args[i]
		if (typeof next == 'number' && next < 0) {
			next = cur.length + next
		}
		cur = cur[next]
		if (cur == undefined) {
			throwPrev(new Error, `path "${args.slice(0, -1).join('/')}" is null at ${args[i]}`, 2)
			halt()
		}
	}
	if (key < 0) {
		key = cur.length + key
	}
	delete cur[key]
}

async function add(...args) {
	check_args('.add', args, 2)
	add_log(...args)
	await write_log('a', args)
}

async function set(...args) {
	check_args('.set', args, 2)
	set_log(...args)
	await write_log('s', args)
}

function add_log(...args) {
	var cur = pwd
	for (var i = 0; i < args.length - 1; i++) {
		var next = args[i]
		if (typeof next == 'number' && next < 0) {
			next = cur.length + next
		}
		cur = cur[next]
		if (cur == undefined) {
			throwPrev(new Error, `path "${args.slice(0, -1).join('/')}" is null at ${args[i]}`, 2)
			halt()
		}
	}
	cur.push(args[args.length - 1])
}

function set_log(...args) {
	var cur = pwd
	var key = args[args.length - 2]
	var value = args[args.length - 1]

	for (var i = 0; i < args.length - 2; i++) {
		var next = args[i]
		if (typeof next == 'number' && next < 0) {
			next = cur.length + next
		}
		cur = cur[next]
		if (cur == undefined) {
			throwPrev(new Error, `path "${args.slice(0, -2).join('/')}" is null at ${args[i]}`, 2)
			halt()
		}
	}
	if (key < 0) {
		key = cur.length - key
	}
	cur[key] = value
}

function schema(template) {
	// does NOT burn/clear, does not save
	dive(db, template)

	function dive(dest, src) {
		for (var i in src) {
			if (dest[i] == undefined) {
				dest[i] = src[i]
				// TODO: this must be logged to disc immediately, or log the entire command
			}
			if (typeof(src[i]) == 'object') {
				dive(dest[i], src[i])
			}
		}
	}
}

async function wait(ms) {
	return new Promise((ok, err)=>{
		setTimeout(ok, ms)
	})
}

async function save(f) {
	while (lock != 0) {
		await wait(10)
	}
	saveInternal()
}

function saveInternal() {
	fs.writeFileSync(dir + '/json.tmp', JSON.stringify(db))
	if (fs.existsSync(dir + '/log')) {
		fs.unlinkSync(dir + '/log')
	}
	if (fs.existsSync(dir + '/json')) {
		fs.unlinkSync(dir + '/json')
	}
	fs.renameSync(dir + '/json.tmp', dir + '/json')
}

function is_locked(show_msg) {
	try {
		var locked = fs.readFileSync(dir + '/lock').toString()
		if (show_msg) {
			console.log(`DB is locked ${locked}`)
			console.log('Database lock file "'
				+ dir
				+ '/lock" is found, either stop another server or delete this file if that instance of the server have crashed.')
		}
		return true
	}
	catch (em) {
		return false
	}
}

function load() {
	burn()
	if (is_locked(true) == true) {
		halt()
	}
	
	// Load JSON
	try {
		var s = fs.readFileSync(dir + '/json').toString()
		var db_temp = JSON.parse(s)
		for (var i in db_temp) {
			db[i] = db_temp[i]
		}
	}
	catch (em) {
		if (em.code != 'ENOENT') {
			console.log(`Unable to open the database "${dir}"`)
			console.log(em)
			halt()
		}
	}
	
	// Load logs
	try {
		var list = fs.readFileSync(dir + '/log').toString().split('\n')
		for (var i = 0; i < list.length - 1; i++) {
			var entry = list[i]
			var cmd = entry[0]
			entry = entry.substr(1)
			var args = JSON.parse(entry)
			if (cmd == 's') set_log(...args)
			if (cmd == 'd') del_log(...args)
			if (cmd == 'c') cd_log(...args)
			if (cmd == 'a') add_log(...args)
		}
	}
	catch (em) {
		if (em.code != 'ENOENT') {
			console.log('Reading log entries failed')
			console.log(em)
			halt()
		}
	}
}

function check_dir(dir) {
	var no_dir = false
	try {
		var S = fs.statSync(dir)
		if (S.isDirectory() != true) no_dir = true
	}
	catch (em) {
		no_dir = true
	}
	if (no_dir) {
		throwPrev(new Error, 'Database directory ' + dir + ' does not exist')
		halt()
	}
}

function halt() {
	options.saveOnExit = false
	process.exit()
}

function burn() {
	// burn() does not save
	for (var i in db) delete db[i]
}

}// function open

