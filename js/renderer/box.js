Box.prototype.toString = function() 
{
	var ret = "Box";
	return ret;
}
function Box(params)
{
	this.type = 2;
	this.width = params.width ? params.width : 1;
	this.opacity = params.opacity ? params.opacity : 0.1;
	this.bufferWidth = params.bufferWidth ? params.bufferWidth : 5;
	this.dasharray = params.dasharray ? params.dasharray : null;
	this.parent = Entity;
	this.parent(params);
	
	this.getData = function()
	{
		var data = this.getMainData();
		data.width = this.width;				// width (Number)
		data.opacity = this.opacity;
		data.bufferWidth = this.bufferWidth;
		data.dasharray = this.dasharray;		// Pattern of the line : null, solid, "10, 5", etc..
		
		return data;
	}
}

Box.prototype.redraw = function()
{
    var box = this.bBox();
    this.svg.select("rect")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .attr("fill", this.color)
        .attr("stroke", this.color)
        .attr("stroke-dasharray", this.dasharray)
        .attr("fill-opacity", this.opacity)
        .attr("stroke-width", this.width);
}
	
Box.prototype.create = function()
{
    this.svg = this.g.svg.select(".boxes").append("svg:g");
    this.eventHandler = new boxEvent(this.g, this);
    this.svg
        .attr("class", "box");
    this.svg.append("svg:rect")
        .attr("fill", this.color)
        .attr("fill-opacity", this.opacity)
        .attr("stroke-width", this.width)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("stroke", this.color);
}

Box.prototype.bBox = function()
{
	var margin = this.bufferWidth;
    var min;
    var max;
    for (var i in this.connect){
        var bb = this.connect[i].bBox('all');
        if (!min){
            min = [bb.x, bb.y];
            max = [bb.x+bb.width, bb.y+bb.height];
        }
        else{
            if (bb.x < min[0]){min[0] = bb.x;}
            else if (bb.x+bb.width > max[0]){max[0] = bb.x+bb.width;}
            if (bb.y < min[1]){min[1] = bb.y;}
            else if (bb.y+bb.height > max[1]){max[1] = bb.y+bb.height;}
        }
    }
    
    var w = max[0]-min[0]+margin*2;
    var h = max[1]-min[1]+margin*2;
    var x = min[0]-margin;
    var y = min[1]-margin;
    if (max[0] < min[0]){
        x = max[0]-margin;
        w = min[0]-max[0]+margin*2;
    }
    if (max[1] < min[1]){
        y = max[1]-margin;
        h = min[1]-max[1]+margin*2;
    }
    return {
        x: parseInt(x)-this.bufferWidth, 
        y: parseInt(y)-this.bufferWidth, 
        width: parseInt(w)+2*this.bufferWidth,
        height: parseInt(h)+2*this.bufferWidth
        };
}