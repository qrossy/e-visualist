

// Handy sprintf() replacement. See http://stackoverflow.com/questions/610406/javascript-printf-string-format
// Usage: "{0} is much cooler than {1} ?".format("Python", "Javascript")
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

merge = function(obj1, obj2)
{
	for (attrname in obj2) { obj1[attrname] = obj2[attrname]; }
	return obj1;
}

array_shuffle = function(a)
{
	var j = 0;
	var valI = '';
	var valJ = valI;
	var l = a.length - 1;
	while(l > -1)
	{
		j = Math.floor(Math.random() * l);
		valI = a[l];
		valJ = a[j];
		a[l] = valJ;
		a[j] = valI;
		l = l - 1;
	}
	return a;
}

array_chunk = function(input, size) 
{
	for (var x, i = 0, c = -1, l = input.length, n = []; i < l; i++) {
		(x = i % size) ? n[c][x] = input[i] : n[++c] = [input[i]];    }
 
	return n;
}


log = function(what)
{
	if (typeof console == 'undefined')
		return;
	if (console && console.log)
		console.log(what);
}

assert = function(cond)
{
	if (!cond)
	{
		if (console && console.trace)
			console.trace('Assertion failed');

		throw 'Assertion failed';
	}
}