nodeEvent.prototype.toString = function() 
{
	return "NodeEvent";
}

function nodeEvent(graph, node)
{
	this.parent = visEvent;
	this.parent(graph, node);
}

nodeEvent.prototype.down = function(event)
{
	
	this.prevPos = {
		x:event.pageX, 
		y:event.pageY
	};
	
	this.visibleArea = this.g.visibleArea();
	this.visibleNodes = this.g.getNodes(this.visibleArea);
	
	this.hasStopped = false;
	
	var zones = null;
	this.g.zonesByEntity ? zones = this.g.zonesByEntity[this.e.id] : false;
	
	if (Interface.addingLink){
		Interface.addingLink.from = this.e;
		this.g.svg.select(".links").append("svg:line")
			.attr("class", "tempLink")
			.attr("stroke-width", 2)
			.attr("stroke", Interface.addingLink.color)
			.attr("pointer-events", "none")
			.attr("x1", this.e.getCenter().x)
			.attr("y1", this.e.getCenter().y)
			.attr("x2", this.e.getCenter().x)
			.attr("y2", this.e.getCenter().y);
	}
	else{
		Interface.get().updateProperties(this);
		//Get all moving nodes
		this.movingEntities = {}
		var self = this;
		var inSelected = false;
		$('.selector[visibility="visible"]').each(function(){
			var id = $(this).attr('entity');
			self.movingEntities[id] = self.g.get(id).getPosition();
			if (id == self.e.id){
				inSelected = true;
			}
		});
		if (!inSelected){
			this.movingEntities = {};
			this.movingEntities[this.e.id] = this.e.getPosition();
		}
	}
	
	this.g.hideHelpers();
}

nodeEvent.prototype.move = function(event)
{
	if (this.hasStopped){
		return;
	}
	this.g.hideAlignmentHelper();
	
	this.newPos = {
		x:event.pageX, 
		y:event.pageY
	};
	
	if (Interface.addingLink){
		var pos = this.g.pos(event.pageX, event.pageY);
		this.g.svg.select(".tempLink")
			.attr("x2", pos[0])
			.attr("y2", pos[1]);
	}
	else{
		
		// if (!Interface.padding){
			// this.e.selector.clear();
		// }
		var dx = (event.pageX-this.prevPos.x)/this.g.scale();
		var dy = (event.pageY-this.prevPos.y)/this.g.scale();
		for (var id in this.movingEntities){
			var p = this.movingEntities[id];
			var e = this.g.get(id);
			var pos = {x: (p.x + dx), y: (p.y + dy)}; 
			if (this.g.snapToGrid){
				pos = this.g.snap(pos);
			}	
			
			var hAlign = false;
			var vAlign = false;
			
			for (var n in this.visibleNodes){
				if (hAlign && vAlign){
					break;
				}
				var n = this.visibleNodes[n];
				if (n != this.e){
					if (Math.abs(pos.y - n.y) < 5 && !vAlign){
						this.g.svg.select('.graph-alignmentH')
							.attr("x1", pos.x+this.e.w/2)
							.attr("y1", n.y-2)
							.attr("x2", n.x+n.w/2)
							.attr("y2", n.y-2)
							.attr("visibility", "visible");
						pos.y = n.y;
						vAlign = true;
					}
					if (Math.abs(pos.x - n.x) < 5 && !hAlign){
						this.g.svg.select('.graph-alignmentV')
							.attr("x1", n.x-2)
							.attr("y1", pos.y+this.e.h/2)
							.attr("x2", n.x-2)
							.attr("y2", n.y+n.h/2)
							.attr("visibility", "visible");
						pos.x = n.x;
						hAlign = true;
					}
				}
			}
			
			e.x = pos.x;
			e.y = pos.y;
			e.redraw();
			e.updateConnect();
		}
		
		//Update TimeBar
		if (this.e.ctrlDateTime == 0 || !this.e.startDateTime || $("#visualist_timebar").is(':hidden')){
			return;
		}
		//Interface.padding = true;
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
	}
}

nodeEvent.prototype.up = function(event)
{
	if (!this.newPos && event.which == 3){
		this.creationPopup(event);
	}
	else if (Interface.addingLink){
		var other = this.getObjectAt(event, true);
		if (other && other.e && other.e.type == 0 && other.e != Interface.addingLink.from){
			Interface.createRelation(event, [Interface.addingLink.from, other.e]);
		}
		this.g.svg.select(".tempLink").remove();
		Interface.addingLink = false;
		document.body.style.cursor = 'default';
	}
	else if (this.newPos){
		var actions = new Array();
		for (var id in this.movingEntities){
			var p = this.movingEntities[id];
			var e = this.g.get(id);
			var newPos = e.getPosition();
			e.x = p.x;
			e.y = p.y;
			actions.push([Action.move, {e:e, pos:newPos}]);
		}
	this.g.ctrl.addBatch(actions, 'Move');
	this.g.ctrl.run();
	}
	
	delete this.prevPos;
	delete this.newPos;
	$(".visualist_linkSelector_type").find('input').each(function(){
		$(this).attr('checked', false);
		$(this).button('refresh');
	});
	Interface.padding = false;
	this.e.selector.update();
}

nodeEvent.prototype.over = function(event)
{	
	if (Interface.dragging){
		return;
	}
	var bb = this.e.bBox();
	this.g.svg.select(".graph-highlight")
		.attr("x", bb.x)
		.attr("y", bb.y)
		.attr("width", bb.width)
		.attr("height", bb.height)
		.attr('visibility', 'visible');
}

nodeEvent.prototype.out = function(event)
{
	if (Interface.dragging){
		return;
	}
	this.g.hideHighlight();
}


nodeEvent.prototype.creationPopup = function(event)
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
		.attr("height", 40);
	
	var self = this;
	//Icon
	svg.append("svg:image")
		.attr("xlink:href", this.e.icon)
		.attr("preserveAspectRatio","xMinYMin")
		.attr("width", "22px")
		.attr("height", 22*this.e.h/this.e.w+"px")
		.attr("x", 10)
		.attr("y", 10)
		.on('click', function() {
			Interface.entityType = 0;
			self.e.shape = 0;
			self.e.create();
			self.e.redraw();
		});
	//Box
	svg.append("svg:rect")
		.attr("fill-opacity", 0)
		.attr("stroke", this.e.color)
		.attr("stroke-width", 1)
		.attr("rx", 5)
		.attr("ry", 5)
		.attr("width", 20)
		.attr("height", 20*this.e.h/this.e.w)
		.attr("x", 40)
		.attr("y", 10)
		.on('click', function() {
			Interface.entityType = 1;
			self.e.shape = 1;
			self.e.create();
			self.e.redraw();
		});
	//Circle
	svg.append("svg:circle")
		.attr("fill-opacity", 0)
		.attr("stroke", this.e.color)
		.attr("stroke-width", 1)
		.attr("r", 10)
		.attr("cx", 80)
		.attr("cy", 22)
		.on('click', function() {
			Interface.entityType = 2;
			self.e.shape = 2;
			self.e.create();
			self.e.redraw();
		});
	//Set
	var m = 5, w = 7, h = 20, s = 10;
	var path = "M-"+m+",0 Q-"+(m+w/2)+",0 -"+(m+w/2)+","+h/4+" T-"+(m+w)+","+h/2+" ";
	path += "M-"+m+","+h+" Q-"+(m+w/2)+","+h+" -"+(m+w/2)+","+h*3/4+" T-"+(m+w)+","+h/2+"";
	path += "M"+(s+m)+",0 Q"+(s+m+w/2)+",0 "+(s+m+w/2)+","+h/4+" T"+(s+m+w)+","+h/2+" ";
	path += "M"+(s+m)+","+h+" Q"+(s+m+w/2)+","+h+" "+(s+m+w/2)+","+h*3/4+" T"+(s+m+w)+","+h/2+" ";
	svg.append("svg:g")
		.attr("transform", "translate(130,13)")
		.attr("class", "set")
		.append("svg:rect")
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", 0)
			.attr("rx", 5)
			.attr("ry", 5)
			.attr("width", 30)
			.attr("height", 20)
			.attr("x", -10)
			.attr("y", 0)
			.on('click', function() {
				self.e.set = self.e.set ? false : true;
				self.e.create();
				self.e.redraw();
				self.e.updateConnect();
			})
	svg.select('.set')
		.append("svg:path")
			.attr("fill-opacity", 0)
			.attr("stroke", this.e.color)
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 2)
			.attr('d', path);
	//ThemeLine
	svg.append("svg:g")
		.attr("class", "theme")
		.append("svg:line")
			.attr("stroke", this.e.color)
			.attr("stroke-width", 2)
			.attr("x1", 190)
			.attr("y1", 25)
			.attr("x2", 210)
			.attr("y2", 25)
	svg.select('.theme')
		.append("svg:image")
			.attr("xlink:href", this.e.icon)
			.attr("preserveAspectRatio","xMinYMin")
			.attr("width", "22px")
			.attr("height", 22*this.e.h/this.e.w+"px")
			.attr("x", 180)
			.attr("y", 10)
			.on('click', function() {
				self.e.theme.draw = self.e.theme.draw ? false : true;
				self.e.create();
				self.e.redraw();
				self.e.updateConnect();
			});

	var rColor = $('<span class="visualist_linkSelector_color">');
	for (var i in Interface.colors){
		var color = Interface.colors[i];
		var c = $('<a href="#" title="'+color+'" style="background-color:'+color+'">&nbsp;&nbsp;&nbsp;</a>')
			.click(function(e) { 
				e.preventDefault(); 
				if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
				self.e.color = this.title;
				self.e.redraw();
				$('#FirstColorPicker a').css('border-color','#ffffff');
				$(this).css('border-color','#444444');
				svg.select('.theme').select('line').attr("stroke", this.title);
				svg.select('.set').select('path').attr("stroke", this.title);
				svg.select('rect').attr("stroke", this.title);
				svg.select('circle').attr("stroke", this.title);
			});
		rColor.append(c);
	}
	div.append($('<div id="FirstColorPicker" style="text-align:center;">').append(rColor));
	
	var wDiv = $('<div style="margin-left:5px;margin-top:5px;">');
	wDiv.append('<input type="text" id="width" size="1" style="float:right;margin-top:-3px;"/>');
	wDiv.append('<div id="slider-width" style="width:185px;margin-left:3px;"></div>');
	div.append(wDiv);
	$('#slider-width').slider({
		orientation: "horizontal",
		range: "min",
		min: 5,
		max: 200,
		step: 5,
		value: self.e.w,
		slide: function( event, ui ) {
			if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.e.getData();
			$( "#width" ).val( ui.value );
			self.e.h = ui.value*self.e.h / self.e.w;
			self.e.w = ui.value;
			self.e.redraw();
			self.e.selector.update();
			self.e.redrawLabels()
			self.e.updateConnect();
		}
	});
	
	$( "#width" ).val( $( "#slider-width" ).slider( "value" ));
	
	$(div).show();
}