/**
* Events
* 
* @constructor
*/
function visEvent(graph, elem)
{
	
	this.g = graph;
	this.e = elem;
	this.verbose = false;
	
	
	this.getObjectAt = function(event, onlyOther)
	{
		var target = $(event.target);
		var parentGroup = target.parent('g');
		if (parentGroup.length === 1)
		{	
			if (onlyOther && parentGroup.attr('id') === this.e.id){
				return null;
			}
			var other = this.g.get(parentGroup.attr('id'));
			return {g:parentGroup,e:other};
		}
		else
			return null;
	}	
	
	var self = this;
	
	var toggleDrag = function(on) {
		if (on) {
			$(document).bind('mousemove',onMouseMove);
			$(document).bind('mouseup', onMouseUp);
			
		} else {
			$(document).unbind('mousemove', onMouseMove);
			$(document).unbind('mouseup', onMouseUp);
		}
		Interface.dragging = on;
	}
	
	var onMouseMove = function(event) 
	{
		if (self.verbose) log(self.toString()+' Move');
		if (!Interface.dragging) {
			toggleDrag(false);
			return;
		}
		self.move(event);
	}
	
	var onMouseUp = function(event) 
	{
		if (self.verbose) log(self.toString()+' Up');
		toggleDrag(false);
		self.up(event);

	}
		
	var onMouseDown = function(event) 
	{
		if (self.verbose) log(self.toString()+' Down');
		if (!event){
			event = d3.event;
		}
		event.preventDefault();
		
		var div = Interface.get().popupDiv;
		$(div).hide();
		
		if (Interface.dragging)
			toggleDrag(false);
		
		self.initPos = self.g.pos(event.pageX, event.pageY);
		//self.g.hideHelpers();
		
		self.down(event);
		
		toggleDrag(true);
	}

	var onMouseOver = function(event) 
	{
		if (self.verbose) log(self.toString()+' Over');
		if (!event){
			event = d3.event;
		}
		event.preventDefault();
		self.over(event);
	}

	var onMouseOut = function(event) 
	{	
		if (self.verbose) log(self.toString()+' Out');
		if (!event){
			event = d3.event;
		}
		event.preventDefault();
		self.out(event);
	}

	this.e.svg
		.on('mouseover', onMouseOver)
		.on('mouseout', onMouseOut)
		.on('mousedown', onMouseDown)
		.on('contextmenu', function() {
			d3.event.preventDefault();
		});
}
// Child methods
// visEvent.prototype.down = function(event)
// {
// }
// visEvent.prototype.move = function(event)
// {
// }
// visEvent.prototype.up = function(event)
// {
// }
// visEvent.prototype.over = function(event)
// {
// }
// visEvent.prototype.out = function(event)
// {
// }

