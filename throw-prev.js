var fs = require('fs')

throwPrev = function throwPrev(e, msg, steps) {

	function drawPointer(line, pos) {
		var p = ''
		while (p.length < pos) {
			p += line[p.length] == '\t' ? '\t' : ' '
		}
		return p + '^'
	}

	if (steps == undefined) steps = 1
	e = e.stack.split('\n').slice(1+steps)
	var src = e[0].split('(')[1].split(')')[0].split(':')
	var line = fs.readFileSync(src[0]).toString().split('\n')[parseInt(src[1])-1]
	var p = drawPointer(line, parseInt(src[2])-1)

	console.log()
	console.log(src.join(':'))
	console.log(line)
	console.log(p)
	console.log()
	console.log(msg)
	console.log(e.join('\n'))
}
