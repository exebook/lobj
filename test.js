var lobj = require('./lobj')

async function main() {
	try {
		var db = lobj.open('data', { saveOnExit: false })
		if (db == undefined) {
			console.log('unable to open')
			process.exit()
		}
		db.burn()

		db.schema({
			user: [],
			board: {},
			setting: {
				flag: 1
			}
		})
		test_errors()
		if (db.board.general == undefined) {
			await db.set('board', 'general', { hidden: false, admin: 'u1' })
		}

		await db.set('board', 'general', 'title', 'Random chat')
		await db.set('board', 'general', 'title', 'General discussion')
		await db.add('user', { name: 'u1' })
		await db.add('user', { name: 'u2' })

		await db.use('user', 0, async x =>{
			await db.set('temp', 'nothing')
			await db.set('phone', '-----')
		})

		await db.save()
		await db.add('user', { name: 'u3' })

		await db.cd('user', 0)
		await db.del('temp')
		await db.set('phone', '12345')
		await db.cd()

		await db.use('user', -1, async x =>{
			await db.set('temp', 'remove me')
			await db.set('phone', '44444')
			await db.set('name', 'user three')
			await db.del('temp')
		})
		await db.close()

		var fs = require('fs')
		var json = fs.readFileSync('data/json').toString()
		var log = fs.readFileSync('data/log').toString()
		var json_ok = '{"user":[{"name":"u1","temp":"nothing","phone":"-----"},{"name":"u2"}],"board":{"general":{"hidden":false,"admin":"u1","title":"General discussion"}},"setting":{"flag":1}}'
		var log_ok = [
			'a["user",{"name":"u3"}]',
			'c["user",0]',
			'd["temp"]',
			's["phone","12345"]',
			'c[]',
			'c["user",-1]',
			's["temp","remove me"]',
			's["phone","44444"]',
			's["name","user three"]',
			'd["temp"]',
			'c[]',
			''
		].join('\n')
		
		var re = lobj.open('data', { saveOnExit: false })
		re_json = JSON.stringify(re)
		var re_json_ok = '{"user":[{"name":"u1","phone":"12345"},{"name":"u2"},{"name":"user three","phone":"44444"}],"board":{"general":{"hidden":false,"admin":"u1","title":"General discussion"}},"setting":{"flag":1}}'

		var phone = re.get('user', 0, 'phone')
		var phone_ok = '12345'

		if (json == json_ok && log == log_ok && re_json == re_json_ok && phone == phone_ok) {
			console.log('OK')
		}
		else {
			console.log('Test failed:', json == json_ok, log == log_ok, re_json == re_json_ok, phone == phone_ok)
		}

		re.close()
	}
	catch (em) {
		console.log('oops', em)
	}
	function test_errors() {
		//uncomment these lines one-by-one to see if the error messages are sane.
		//db.del('user', 'nobody', 'empty')
		//db.cd('user', 'nobody', 'empty', x=>{})
		//db.add('user', 'nobody', 'empty')
		//db.set('user', 'nobody', 'empty', 'nothing')
	}
}

main()
