boxEvent.prototype.toString = function() 
{
	return "BoxEvent";
}

function boxEvent(graph, box)
{
	this.parent = visEvent;
	this.parent(graph, box);
}

boxEvent.prototype.down = function(event)
{
    this.g.hideHelpers();
}

boxEvent.prototype.move = function(event)
{

}

boxEvent.prototype.up = function(event)
{
	if (!this.newPos && event.which == 3){
		this.creationPopup(event);
	}
	delete this.prevPos;
	delete this.newPos;
	Interface.padding = false;
	this.e.selector.update();
}

boxEvent.prototype.over = function(event)
{		
	//document.body.style.cursor = 'crosshair';
	if (Interface.dragging){
		return;
	}
}

boxEvent.prototype.out = function(event)
{
	if (Interface.dragging){
		return;
	}
	//document.body.style.cursor = 'default';
}

boxEvent.prototype.creationPopup = function(event)
{		
	var div = Interface.get().popupDiv;
	$(div)
		.css("left", event.pageX-115)
		.css("top", event.pageY)
		.css("width", "230px")
		.css("border", "1px solid #CCCCCC")
		.html("")
		.bind('contextmenu', function(event) {event.preventDefault();});
	var svg = d3.select("#visualist_popup")
		.append("svg:svg")
		.attr("width", 250)
		.attr("height", 100);
	
	var createLine = function(from, to){
		var line = svg.append("svg:g");
		line.append("svg:path")
			.attr("class", "ground")
			.attr("fill-opacity", 0)
			.attr("stroke-linejoin", "round")
			.attr("stroke-width", 15)
			.attr("stroke", "#ffffff")
			.attr("d", "M"+from+" L"+to);
		line.append("svg:path")
			.attr("class", "arrow")
			.attr("fill-opacity", 0)
			.attr("stroke-linejoin", "round")
			.attr("stroke-width", 2)
			.attr("stroke", "black")
			.attr("d", "M"+from+" L"+to);
		return line;
	}

	var s = 10;
	var margin = 15;
	var c = {x:s+margin+50, y:s+margin};
	var width = 80;
	var dasharray = [null, '10,5', '3,4', '1,3'];
	var i = 0
	c.x += margin;
	
	var self = this;
	for (var d in dasharray){
		var pattern = dasharray[d];
		var line = createLine((c.x)+","+(c.y-15+i*10), (c.x+width)+","+(c.y-15+i*10));
		line.select('.arrow').attr("stroke-dasharray", pattern);
		line.on('mouseup', function(){
			if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
			self.e.dasharray = $(this).find('.arrow').attr("stroke-dasharray");
			self.e.redraw();
			$(this).parent().find('.arrow').each(function(){$(this).attr("stroke", "black");});
			$(this).find('.arrow').attr("stroke", "red");
			});
		if (self.e.dasharray == pattern) line.select(".arrow").attr("stroke", "red");
		i += 1;
	}
	c.x += width+5;
	svg.attr("width", c.x).attr("height", c.y+s+margin);
	
	//width slider
	svgSlider(svg, 0, 0, "width", 1, 35, 1, "width", self.e);
	
	//bufferSlider
	svgSlider(svg, 25, 0, "buffer", 0, 35, 1, "bufferWidth", self.e);
	
	//opacitySlider
	svgSlider(svg, 50, 0, "opacity", 0, 1, 0.1,  "opacity", self.e);
	
	var linkDiv = $('<div id="FirstColorPicker" style="text-align:center;">');
	var rColor = $('<span class="visualist_linkSelector_color">');
	for (var i in Interface.colors){
		var color = Interface.colors[i];
		var link = $('<a href="#" title="'+color+'" style="background-color:'+color+'">&nbsp;&nbsp;&nbsp;</a>')
			.click(function(e) { 
				e.preventDefault(); 
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.color = this.title;
				self.e.redraw();
				$('#FirstColorPicker a').css('border-color','#ffffff');
				$(this).css('border-color','#444444');
			});
		rColor.append(link);
	}
	linkDiv.append(rColor);
	div.append(linkDiv);
	var linkDiv = $('<div id="SecondColorPicker" style="text-align:center;">');
	var rColor = $('<span class="visualist_linkSelector_color">');
	for (var i in Interface.colors){
		var color = Interface.colors[i];
		var link = $('<a href="#" title="'+color+'" style="background-color:'+color+'">&nbsp;&nbsp;&nbsp;</a>')
			.click(function(e) { 
				e.preventDefault(); 
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.secondColor = this.title;
				self.e.redraw();
				$('#SecondColorPicker a').css('border-color','#ffffff');
				$(this).css('border-color','#444444');
			});
		rColor.append(link);
	}
	linkDiv.append(rColor);
	if (!(this.e.connectCount() == 2 && this.e.arrow == this.e.id)){
		linkDiv.hide();
	}
	div.append(linkDiv);
	
	$(div).show();
}



