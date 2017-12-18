linkEvent.prototype.toString = function()
{
	return "LinkEvent";
};

function linkEvent(graph, link)
{
	this.parent = visEvent;
	this.parent(graph, link);
}

linkEvent.prototype.down = function(event)
{
	this.initObjPos = this.e.getPosition();
	this.initPos = {
		x:event.pageX,
		y:event.pageY
	};
	this.prevPos = this.initObjPos;
	this.isThemeLink = this.e.isThemeLink();

	this.hasStopped = false;

	var zones = null;
	this.g.zonesByEntity ? zones = this.g.zonesByEntity[this.e.id] : false;

	if (Interface.addingCorner){
		var id = null;
		var segments = null;
		var point = this.g.pos(event.pageX, event.pageY);
		if (this.e.connectCount() == 2 && this.e.arrow == this.e.id){
			segments = this.e.getMainPath().node().getPathData();
		}
		else{
			id = $(event.target).attr('class').split('e')[1];
			segments = this.e.svg.select(".e"+id).node().getPathData();
		}
		var index = Link.getPathIndex(segments, point);
		var prev = segments.getItem(index-1);
		var next = segments.getItem(index);
		var ratio = Link.vector(prev, point).norm() / Link.vector(prev, next).norm();
		this.e.setMainPath(segments.path);
		this.g.ctrl.addAction(Action.createCorner, {g: this.g, e:this.e, ratio:ratio, index:index, id:id});
		this.g.ctrl.run();
		Interface.addingCorner = false;
		$("#addCorner").attr('checked', false);
		$("#addCorner").button('refresh');
		this.e.selector.update();
	}
	this.g.hideHelpers();
};

linkEvent.prototype.move = function(event)
{
	if (this.hasStopped || !this.isThemeLink){
		return;
	}

	this.newPos = {
		x:this.initObjPos.x+(event.pageX-this.initPos.x)/this.g.scale(),
		y:this.initObjPos.y+(event.pageY-this.initPos.y)/this.g.scale()
	};

	if (!Interface.padding){
		this.e.selector.clear();
	}
	Interface.padding = true;

	this.e.x = this.newPos.x;
	this.e.redraw();

	//Update TimeBar
	if (this.e.ctrlDateTime == 0 || !this.e.startDateTime || $("#visualist_timebar").is(':hidden')){
		return;
	}

	var zones = this.g.zonesByEntity[this.e.id];

	//If this is the first controlled Event, everything move
	if (Interface.timebar.getBand(0).getEtherPainter()._zones[0].endTime == this.e.startDateTime.getTime()){
		Interface.timebar.getBand(0)._moveEther(this.newPos.x-this.prevPos.x);
	}

	if (zones.start && this.e.ctrlDateTime == 1){
		var startMagnify = zones.start.magnify - (this.newPos.x - this.prevPos.x)/(zones.start.delta/(3600*10*24));
		if (startMagnify < 0.01 && startMagnify < zones.start.magnify){
			this.hasStopped = true;
		}
	}

	if (zones.end){
		var endMagnify = zones.end.magnify + (this.newPos.x - this.prevPos.x)/(zones.end.delta/(3600*10*24));
		if (endMagnify < 0.01 && endMagnify < zones.end.magnify){
			this.hasStopped = true;
		}
	}

	if (this.hasStopped){
		this.newPos = this.prevPos;
		return;
	}

	if (zones.start && this.e.ctrlDateTime == 1){
		zones.start.magnify = startMagnify;
		zones.start.unit = Interface.timeBarParams.intervalUnit - parseInt(zones.start.magnify/2);
	}

	if (zones.end){
		zones.end.magnify = endMagnify;
		zones.end.unit = Interface.timeBarParams.intervalUnit - parseInt(zones.end.magnify/2);
	}

	Interface.UpdateTimebar(this.g.timeZones);

	// Update Other Entities

	if (this.e.ctrlDateTime == 2){
		for (var id in this.g.all){
			var e = this.g.all[id];
			if (e.theme && e.theme.draw){continue;}
			if (id != this.e.id && e.x > this.prevPos.x){
			 e.x += (this.newPos.x - this.prevPos.x);
			 e.redraw();
			}
		}
	}

	this.prevPos = this.newPos;
};

linkEvent.prototype.up = function(event)
{
	if (!this.newPos && event.which == 3){
		this.creationPopup(event);
	}
	else{
		if (this.newPos){
			this.e.x = this.initObjPos.x;
			this.g.ctrl.addAction(Action.move, {e:this.e, pos:this.newPos});
			this.g.ctrl.run();
		}
	}

	delete this.prevPos;
	delete this.newPos;
	Interface.padding = false;
	this.e.selector.update();
};

linkEvent.prototype.over = function(event)
{
	document.body.style.cursor = 'crosshair';
	if (Interface.dragging){
		return;
	}
};

linkEvent.prototype.out = function(event)
{
	if (Interface.dragging){
		return;
	}
	document.body.style.cursor = 'default';
};

linkEvent.prototype.creationPopup = function(event)
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
	var segments = event.path ? event.path.getPathData() : event.target.getPathData();
	log(segments);
	var v = Link.vector(segments.getItem(1), segments.getItem(segments.numberOfItems-2));

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
	};

	var dist = 4; // ArrowLength
	var space = 5; // ArrowSpace
	var arrow = function(point, reverse){
		if (reverse) dist = -dist;
		var d = " M"+(point.x + dist*v.ux() + (space*v.uy()))+","+(point.y + dist*v.uy() + (-space*v.ux()));
		d += " L"+point.x+","+point.y;
		d += " L"+(point.x + dist*v.ux() - (space*v.uy()))+","+(point.y + dist*v.uy() - (-space*v.ux()));
		return d;
	};

	var s = 10;
	var margin = 15;
	var c = {x:s+margin+5, y:s+margin};
	var self = this;
	for (var i = 1; i < 5; i++){
		var line = createLine((c.x-s*v.ux())+","+(c.y-s*v.uy()), (c.x+s*v.ux())+","+(c.y+s*v.uy()));
		if (i == 1){
			line.on('mouseup', function(){
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.arrow = null;
				self.e.arrowOthers = false;
				if (self.e.space != 0){self.e.removeMainPath();}
				self.e.redraw();
				$(this).parent().find('.arrow').each(function(){$(this).attr("stroke", "black");});
				$(this).find('.arrow').attr("stroke", "red");
				if (self.e.connectCount() == 2){ $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');$('#SecondColorPicker').hide();}
				});
			if (self.e.arrow == null) line.select(".arrow").attr("stroke", "red");
		}
		if (i == 2){
			var point = {x:(c.x-s*v.ux()), y:(c.y-s*v.uy())};
			var d = arrow(point);
			line.select(".arrow").attr('d', line.select(".arrow").attr('d')+d);
			var id = event.path ? $(event.path).attr('class').split("e")[1]: $(event.target).attr('class').split("e")[1];
			line.on('mouseup', function(){
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.arrow = id;
				self.e.arrowOthers = false;
				if (self.e.space != 0){self.e.removeMainPath();}
				self.e.redraw();
				$(this).parent().find('.arrow').each(function(){$(this).attr("stroke", "black");});
				$(this).find('.arrow').attr("stroke", "red");
				if (self.e.connectCount() == 2){ $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');$('#SecondColorPicker').hide();}
				});
			if ((!self.e.arrowOthers && self.e.arrow == id) || (self.e.arrowOthers && self.e.arrow != id)) line.select(".arrow").attr("stroke", "red");
		}
		else if (i ==3){
			var point = {x:(c.x+s*v.ux()), y:(c.y+s*v.uy())};
			var d = arrow(point, true);
			line.select(".arrow").attr('d', line.select(".arrow").attr('d')+d);
			var id = event.path ? $(event.path).attr('class').split("e")[1]: $(event.target).attr('class').split("e")[1];
			line.on('mouseup', function(){
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.arrow = id;
				self.e.arrowOthers = true;
				if (self.e.space != 0){self.e.removeMainPath();}
				self.e.redraw();
				$(this).parent().find('.arrow').each(function(){$(this).attr("stroke", "black");});
				$(this).find('.arrow').attr("stroke", "red");
				if (self.e.connectCount() == 2){ $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');$('#SecondColorPicker').hide();}
				});
			if ((!self.e.arrowOthers && self.e.arrow != id && self.e.arrow != null && self.e.arrow != self.e.id) ||(self.e.arrowOthers && self.e.arrow == id) ) line.select(".arrow").attr("stroke", "red");
		}
		else if (i ==4){
			var point = {x:c.x, y:c.y};
			var d1 = arrow(point);
			var d2 = arrow(point, true);
			line.select(".arrow").attr('d', line.select(".arrow").attr('d')+d1+d2);
			line.on('mouseup', function(){
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.arrow = self.e.id;
				self.e.arrowOthers = false;
				if (self.e.space != 0){self.e.addMainPath();}
				self.e.redraw();
				$(this).parent().find('.arrow').each(function(){$(this).attr("stroke", "black");});
				$(this).find('.arrow').attr("stroke", "red");
				if (self.e.connectCount() == 2){ $(this).parent().find('.ratio-ctrl').attr("visibility", 'visible');$('#SecondColorPicker').show();}
				});
			if (self.e.arrow == self.e.id) line.select(".arrow").attr("stroke", "red");

		}
		c.x += s+margin;
	}
	var width = 80;
	var dasharray = [null, '10,5', '3,4', '1,3'];
	var i = 0;
	c.x += margin;
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

	//widthSlider
	svgSlider(svg, 0, 0, "width", 1, 35, 1, "width", self.e);

	if (this.e.connectCount() == 2){
		var ratioSvg = svg.append("svg:foreignObject")
			.attr("x", 120)
			.attr("y", 0)
			.attr("width", 20)
			.attr("height", 70)
			.attr("class", "ratio-ctrl")
			.attr("visibility", this.e.arrow == this.e.id ? 'visible' : 'hidden');
		var rDiv = $('<div style="margin-left:5px;">');
		rDiv.append('<input type="text" id="ratio" size="1"/>');
		rDiv.append('<div id="slider-ratio" style="height:25px;"></div>');
		$(ratioSvg.node()).append(rDiv);
		$("#slider-ratio").slider({
				orientation: "vertical",
				range: "min",
				min: 0.1,
				max: 0.9,
				step: 0.05,
				value: self.e.ratio,
				slide: function( event, ui ) {
					if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
					$( "#ratio" ).val( ui.value );
					self.e.ratio = ui.value;
					self.e.redraw();
				}
			});
		$( "#ratio" ).val( $( "#slider-ratio" ).slider( "value" ));
	}
	var linkDiv = $('<div id="FirstColorPicker" style="text-align:center;margin-top:2px;">');
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

	// var eType = $('<div class="visualist_selector_type" style="margin-bottom:5px;">')
	// eType.append('<input type="radio" id="visualist_selector_type1" name="radio" checked="checked" value="0"/><label for="visualist_selector_type1">Icon</label>');
	// eType.append('<input type="radio" id="visualist_selector_type2" name="radio" value="1"/><label for="visualist_selector_type2">Box</label>');
	// eType.append('<input type="radio" id="visualist_selector_type3" name="radio" value="2"/><label for="visualist_selector_type3">Circle</label>');
	// eType.append('<input type="radio" id="visualist_selector_type4" name="radio" value="3"/><label for="visualist_selector_type4">Link</label>');
	// eType.append('<input type="radio" id="visualist_selector_type5" name="radio" value="4"/><label for="visualist_selector_type5">Polygon</label>');
	// eType.append('<input type="radio" id="visualist_selector_type6" name="radio" value="5"/><label for="visualist_selector_type6">LinkBox</label>');

	// eType.buttonset();
	// eType.find('input').click(function() {
		// var type = parseInt($(this).attr('value'));
		// var data = self.e.getData();
		// self.g.ctrl.addAction(Action.removeEntity, {e:self.e, g:self.g});
		// self.g.ctrl.run();
		// if (type == 0 || type == 1 || type == 2){
			// data.shape = type;
			// self.g.ctrl.addAction(Action.createNode, {e:data, g:self.g});
			// var node = self.g.ctrl.run();
			// for (var i in node.connect){
				// self.g.createRelation('link',[node.connect[i], node], {color:data.color});
			// }
		// }
	// });
	// div.append(eType);

	$(div).show();
};
