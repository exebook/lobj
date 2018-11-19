#lobj

## Logged Object

The purpose of this library is to provide no-dependency persistent fast in-memory database.

Lobj basically provides a JavaScript object saved to disc incrementally as you modify it.

The incremental save is called "logging" and happens immediately after each modification.

The log file contains each modification on a separate line.

When your app exits or when you explicitly call `db.save()` the entire current 
state of the object is serialized using JSON into a single file and the log file is deleted.

This JSON file is called simply "json".

When your app restarts, it will read data from the json file AND THEN all the newer updates
from the log file. 

If your app was crashed, the json file will contain the old data, from the last call to `save`, and the log file will contain all the recent data that was modified after the save but before the crash.

That's it.

###Usage

To open the db, create a directory somewhere and pass it a s first parameter to `open()`

```js
//example.js
var lobj = require('lobj')

async function main() {
	var db = lobj.open('data')
}

main()
```

```bash
mkdir data
node example.js
```

To explicitly save and close your database just call:
```js
	await db.save()
	await db.close()
```

Lobj library installs a hook on process exit, in that hook the db will be saved and closed for you. If the app crashes instead, the database will be locked. The lock is a file in a database directory named `lock`. If your app crashed, you will not be able to restart it until you manually delete the `lock` file. The lock file protects you from running multiple instances of the app or running another app that accesses the same db while the first one still running.

Let's create a web forum backend database, we will have a schema like this:

```js
	db.schema({
		user: [],
		board: {},
	})
```

Now let's add a user:

```js
	await db.add('user', { name: 'john', email: 'john@example.com', password: '11111111' })
```

Using `schema()` function is not necessary, you can instead use `set` and `add` to initialize your db.

For example if you did not want to use `schema()`, you could create the `board` like this:

```js
	if (db.board == undefined) await db.set('board', {})
```

To read from the db, you just access it as a regular JavaScript object:

```js
	console.log(db.user.john.email)
```

To change the existing data use `set()`

```js
	await db.set('board', 'general', { title: 'General discussion' })
	await db.set('board', 'general', 'title', 'Random talk')
	await db.set('board', 'general', 'post', [])
```

As you can see, all arguments except the last one are used as a path to data. The last argument is the new value.

The code `set('a', 'b', 'c', 'd')` is equivalent to `a.b.c = d`, the difference is that the data is persistently saved immediately when you use `set()`. 

*Never modify the underlying data directly!* Always use `set()` and `add()` instead.

You can also use `cd()` to to avoid typing long paths:

```js
	await db.cd('board', 'general', 'post')
	await db.add({user: 'john', title: 'my first post', text: 'hello there!'})
```

There is no such thing as `cd('..')`, sorry, but this is simply because JavaScript objects do not contain the uplink.

Using `cd()` without arguments will set current path back to the root object.

A similar option is to use the `use` function:

```js
	await db.use('board', 'general', 'post', -1, post => {
		console.log(post.user)
		console.log(post.title)
		console.log(post.text)
	})
```

Note that for arrays you can use negative indexes in paths. Here `-1` simple means *the last one*.

###Reference

####Module functions

- open(path, options)
	Opens or initializes the database and uses the directory located at `path` for working files.
	Options are
	- SaveOnExit: defaults to true

####Instance functions

- cd(...path)
	Enters the `path`, returns the selected object.

- use(...path, callback)
	Enters the `path, passes the selected object to the callback, restores the cur-path before returns.

- cur()
	Returns currently selected object.

- get(...path)
	async: no
	Returns an object located at `path`
	
- set(...path, key, value)
	Sets a `key` to a `value` in the object located at `path`

- del(...path, key)
	Deletes a `key` from an object located at `path`

- add(...path, value)
	Adds `value` to an array located at `path`, if the object at `path` is not an array, it will throw an error.

- save()
	Serializes and saves all current data, deletes existing log file if save worked successfully.

- burn()
	async: no
	Deletes all keys from the root object. Does not save.

- close()
	Closes the database, deletes the lock file.

- schema(template)
	async: no
	Recursively copies elements from the template into a root object if they do not exist yet.





