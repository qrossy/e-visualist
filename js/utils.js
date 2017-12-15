function getRandomPoints(numPoint, xMax, yMax) {
	var points = new Array();
	for (var i = 0; i <= numPoint; i++) {
		var x =  parseInt(Math.random()*(xMax-64));
		var y =  parseInt(Math.random()*(yMax-64));
		points.push( [ x, y ] )
	}
	return points
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
	/*On appel le constructeur de l'instance source pour crée une nouvelle instance de la même classe*/
	var newInstance = srcInstance.constructor();
	/*On parcourt les propriétés de l'objet et on les recopies dans la nouvelle instance*/
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
  })
  $('label', this).each(function(index){
    $(this).width(mw);
  })
};
})( jQuery );