

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
	for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
	return obj1;
};

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
};

array_chunk = function(input, size)
{
	for (var x, i = 0, c = -1, l = input.length, n = []; i < l; i++) {
		(x = i % size) ? n[c][x] = input[i] : n[++c] = [input[i]];
  }
	return n;
};


log = function(what)
{
	if (typeof console == 'undefined')
		return;
	if (console && console.log)
		console.log(what);
};

assert = function(cond)
{
	if (!cond)
	{
		if (console && console.trace)
			console.trace('Assertion failed');

		throw 'Assertion failed';
	}
};

function getRandomPoints(numPoint, xMax, yMax) {
	var points = [];
	for (var i = 0; i <= numPoint; i++) {
		var x =  parseInt(Math.random()*(xMax-64));
		var y =  parseInt(Math.random()*(yMax-64));
		points.push( [ x, y ] );
	}
	return points;
}

/*
* Fonction de clonage
* @author Keith Devens
* @see http://keithdevens.com/weblog/archive/2007/Jun/07/javascript.clone
*/
function clone(srcInstance)
{
	/*Si l'instance source n'est pas un objet ou qu'elle ne vaut rien c'est une feuille donc on la retourne*/
	if(typeof(srcInstance) != 'object' || srcInstance == null)
	{
		return srcInstance;
	}
	/*On appel le constructeur de l'instance source pour creer une nouvelle instance de la meme classe*/
	var newInstance = srcInstance.constructor();
	/*On parcourt les proprietes de l'objet et on les recopies dans la nouvelle instance*/
	for(var i in srcInstance)
	{
		newInstance[i] = clone(srcInstance[i]);
	}
	/*On retourne la nouvelle instance*/
	return newInstance;
}

/*
* Vertical JQuery ButtonSet
* @author edersohe
* @see https://gist.github.com/760885
*/
(function( $ ){
	//plugin buttonset vertical
	$.fn.buttonsetv = function() {
		$(':radio, :checkbox', this).wrap('<div style="margin: -1px"/>');
		$(this).buttonset();
		$('label:first', this).removeClass('ui-corner-left').addClass('ui-corner-top');
		$('label:last', this).removeClass('ui-corner-right').addClass('ui-corner-bottom');
		mw = 0; // max witdh
		$('label', this).each(function(index){
			w = $(this).width();
			if (w > mw) mw = w;
		});
		$('label', this).each(function(index){
			$(this).width(mw);
		});
	};
})( jQuery );
