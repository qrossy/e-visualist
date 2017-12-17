Node.prototype.toString = function()
{
	var ret = "Node";
	return ret;
}

function Node(params)
{
	this.type = 0;
	params.shape ? this.shape = params.shape : this.shape = 0;
	params.icon ? this.icon = params.icon : this.icon = null;
	params.w ? this.w = params.w : this.w = 40;
	params.h ? this.h = params.h : this.h = 40;
	params.set ? this.set = params.set : this.set = false;
	params.theme ? this.theme = params.theme : this.theme = {draw:false, mostLeft:true, mostRight:true};
	params.set_margin ? this.set_margin = params.set_margin : this.set_margin = 5;
	params.set_width ? this.set_width = params.set_width : this.set_width = 15;

	params.labels = params.labels ? params.labels : [new Label({e:this, text:params.text})];

	this.parent = Entity;
	this.parent(params);

	this.getData = function()
	{
		var data = this.getMainData();

		data.shape = this.shape;					// 0 = Icon, 1 = Box, 2 = Circle
		data.icon = this.icon;						// href to iconImage
		data.w = this.w;							// Width
		data.h = this.h;							// Height
		data.theme = this.theme;					// Object: {draw:Boolean, mostLeft:Boolean, mostRight:Boolean} (draw Horizontal Line)
		data.set = this.set;						// Boolean: true if is a Set (draw Braces)
		data.set_margin = this.set_margin;			// Margin between the Braces and the node
		data.set_width = this.set_width;			// Width of the Braces
		return data;
	}
}

Node.prototype.redraw = function()
{
	this.svg.attr("transform", "translate("+this.x+","+this.y+")");
	if (this.shape == 0){
		this.svg.select("image")
			.attr("xlink:href", this.icon)
			.attr("width", this.w+"px")
			.attr("height", this.h+"px");
	}
	else if (this.shape == 1){
		this.svg.select("rect")
			.attr("width", this.w)
			.attr("height", this.h)
			.attr("fill", this.color)
			.attr("fill-opacity", 0)
			.attr("stroke", this.color);
	}
	else if (this.shape == 2){
		var r = this.w < this.h ? this.w/2: this.h/2;
		this.svg.select("circle")
			.attr("cx", r)
			.attr("cy", r)
			.attr("r", r)
			.attr("fill", this.color)
			.attr("fill-opacity", 0)
			.attr("stroke", this.color);
	}

	if (this.set){
		var m = this.set_margin;
		var w = this.set_width;
		var path = "M-"+m+",0 Q-"+(m+w/2)+",0 -"+(m+w/2)+","+this.h/4+" T-"+(m+w)+","+this.h/2+" ";
		path += "M-"+m+","+this.h+" Q-"+(m+w/2)+","+this.h+" -"+(m+w/2)+","+this.h*3/4+" T-"+(m+w)+","+this.h/2+"";
		path += "M"+(this.w+m)+",0 Q"+(this.w+m+w/2)+",0 "+(this.w+m+w/2)+","+this.h/4+" T"+(this.w+m+w)+","+this.h/2+" ";
		path += "M"+(this.w+m)+","+this.h+" Q"+(this.w+m+w/2)+","+this.h+" "+(this.w+m+w/2)+","+this.h*3/4+" T"+(this.w+m+w)+","+this.h/2+" ";
		this.svg.select(".set")
			.attr('d', path)
			.attr("stroke", this.color);
	}

	if (this.theme.draw){
		var band = Interface.timebar.getBand(0);
		var minX = this.x + this.w;
		var maxX = this.x;
		for (var id in this.connect){
			var x = this.connect[id].x;
			if (x < minX){ minX = x;}
			if (x > maxX){ maxX = x;}
		}
		this.g.svg.select(".theme"+this.id)
			.attr('x1', minX)
			.attr('y1', this.y + this.h/2)
			.attr('x2', maxX)
			.attr('y2', this.y + this.h/2)
			.attr("stroke", this.color);
	}
	for (var i in this.labels){
		this.labels[i].redraw();
	}
}

Node.prototype.create = function()
{
	if (this.svg) {this.svg.remove();}
	this.svg = this.g.svg.select(".nodes").append("svg:g");
	this.eventHandler = new nodeEvent(this.g, this);

	this.svg
		.attr("class", "nodeEntity")
		.attr("id", this.id);
	//$(this.svg.node()).empty();
	if (this.shape == 0){
		this.svg.append("svg:image")
			.attr("xlink:href", this.icon)
			.attr("preserveAspectRatio","xMinYMin");
			//.attr("width", this.w+"px")
			//.attr("height", this.h+"px");
	}
	else if (this.shape == 1){
		this.svg.append("svg:rect")
			.attr("fill", this.color)
			.attr("fill-opacity", 0)
			.attr("stroke", this.color)
			.attr("stroke-width", 2)
			.attr("rx", 5)
			.attr("ry", 5)
			.attr("width", this.w)
			.attr("height", this.h);
	}
	else if (this.shape == 2){
		this.svg.append("svg:circle")
			.attr("fill", this.color)
			.attr("fill-opacity", 0)
			.attr("stroke", this.color)
			.attr("stroke-width", 2)
			.attr("r", this.w/2);
	}

	if (this.set){
		this.svg.append("svg:path")
			.attr("class", "set")
			.attr("fill-opacity", 0)
			.attr("stroke", this.color)
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 3);
	}

	if (this.theme.draw){
		this.g.svg.select(".themeLines").append("svg:line")
			.attr("class", "theme"+this.id)
			.attr("fill-opacity", 0)
			.attr("stroke", this.color)
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 3);
	}
	else{
		var theme = this.g.svg.select(".theme"+this.id);
		if (theme) theme.remove();
	}
	this.createLabels();
}

Node.prototype.setBox = function(box)
{
	this.x = box.x;
	this.y = box.y;
	this.w = box.width;
	this.h = box.height;
}


Node.prototype.getCenter = function()
{
	var center = new Object();
	var bb = this.bBox();
	center.x = this.x+bb.width/2;
	center.y = this.y+bb.height/2;
	return center;
}

Node.prototype.bBox = function(mode)
{
	if (mode == 'all'){
		var elm = this.svg.node();
	}
	else if (this.shape == 0){
		var elm = this.svg.select('image').node();
	}
	else if (this.shape == 1){
		var elm = this.svg.select('rect').node();
	}
	else if (this.shape == 2){
		var elm = this.svg.select('circle').node();
	}
	if (!elm.getBBox){
		elm = elm.correspondingUseElement;
	}
	var box = elm.getBBox();
	box.x = this.x ? this.x : 0;
	box.y = this.y ? this.y : 0;
	box.width = this.w;
	box.height = this.h;
	if (mode == 'all'){
		var off = $(elm).offset();
		var pos = this.g.pos(off.left, off.top);
		box.x = pos[0];
		box.y = pos[1];
	}
	else if (this.set && mode == 'link'){
		box.x = (this.x - this.set_margin - this.set_width);
		box.width += (this.set_margin*2 + this.set_width*2);
	}

	return box;
}
