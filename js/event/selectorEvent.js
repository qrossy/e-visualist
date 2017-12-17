selectorEvent.prototype.toString = function()
{
	return "SelectorEvent";
}

function selectorEvent(graph, node)
{
	this.parent = visEvent;
	this.parent(graph, node);
}

selectorEvent.prototype.down = function(event)
{
	if (this.e.elem.type == 0){
		this.id = $(event.target).attr('class');
		this.initialBox = this.e.elem.bBox();
		this.fixedPos = this.e.gripPos(Selector.fixPoint[this.id]);
	}
	else if (this.e.elem.type == 1){
		$(event.target).attr("fill", '#ff0000');
		Interface.selectedCorner = $(event.target);
		this.initialCP = $(event.target).attr('class');
		var info = this.initialCP.split("_");
		if(info[0] != 'center'){
			var links = this.g.relations[this.e.elem.hash()];
			this.dInit = new Array();
			for (var i in links){
				var link = links[i];
				var path = link.svg.select("."+info[0]);
				this.dInit.push(path.attr('d'));
			}
		}
	}
	this.prevPos = this.g.pos(event.pageX, event.pageY);
	this.newPos = null;
}

selectorEvent.prototype.move = function(event)
{
	this.newPos = this.g.pos(event.pageX, event.pageY);
	this.g.hideAlignmentHelper();

	if (this.e.elem.type == 0){
		if (this.id != 'n' && this.id != 's'){
			var dx = this.newPos[0]-this.fixedPos[0];
			this.e.elem.x = this.fixedPos[0];
			this.e.elem.w = dx;
			if (dx < 0){
				//this.id = Selector.oppositeX[this.id];
				//this.fixedPos = this.e.gripPos(Selector.fixPoint[this.id]);
				this.e.elem.x += dx;
				this.e.elem.w = -dx;
			}
		}

		if (this.id != 'e' && this.id != 'w'){
			var dy = this.newPos[1]-this.fixedPos[1];
			this.e.elem.y = this.fixedPos[1];
			this.e.elem.h = dy;
			if (dy < 0){
				//this.id = Selector.oppositeY[this.id];
				//this.fixedPos = this.e.gripPos(Selector.fixPoint[this.id]);
				this.e.elem.y += dy;
				this.e.elem.h = -dy;
			}
		}
		if (this.e.elem.shape == 0){
			if (this.e.elem.w < this.e.elem.h){
				var h = this.e.elem.w*(this.initialBox.height/this.initialBox.width);
				this.e.elem.h = h;
			}
			else{
				var w = this.e.elem.h*(this.initialBox.width/this.initialBox.height);
				this.e.elem.w = w;
			}
		}
		this.e.elem.redraw();
		this.e.elem.redrawLabels();
		this.e.elem.updateConnect();
		this.e.update();
	}
	else if (this.e.elem.type == 1){
		var info = this.initialCP.split("_");
		//multilink centerPoint
		if(info[0] == 'center'){
			var links = this.g.relations[this.e.elem.hash()];
			for (var i in links){
				var link = links[i];
				link.x = this.newPos[0];
				link.y = this.newPos[1];
				link.redraw();
			}
		}
		//Any other controlPoint
		else {
			var index = parseInt(info[2]);
			if (!index){
				return;
			}
			var links = this.g.relations[this.e.elem.hash()];
			var path = this.e.elem.connectCount() == 2 ? this.e.elem.getRootMainPath() : links[0].svg.select('.'+info[0]);
			var cp = path.node().pathSegList.getItem(index);
			cp.x += (this.newPos[0] - this.prevPos[0]);
			cp.y += (this.newPos[1] - this.prevPos[1]);

			var prev = path.node().pathSegList.getItem(index-1);
			var next = path.node().pathSegList.getItem(index+1);
			if (Math.abs(prev.x - cp.x) <= 5){
				cp.x = prev.x;
				this.g.svg.select('.graph-alignmentV')
					.attr("x1", cp.x + 2)
					.attr("y1", cp.y)
					.attr("x2", cp.x + 2)
					.attr("y2", prev.y)
					.attr("visibility", "visible");
			}
			else if (Math.abs(next.x - cp.x) <= 5){
				cp.x = next.x;
				this.g.svg.select('.graph-alignmentV')
					.attr("x1", cp.x + 2)
					.attr("y1", cp.y)
					.attr("x2", cp.x + 2)
					.attr("y2", next.y)
					.attr("visibility", "visible");
			}
			if (Math.abs(prev.y - cp.y) <= 5){
				cp.y = prev.y;
				this.g.svg.select('.graph-alignmentH')
					.attr("x1", cp.x)
					.attr("y1", cp.y + 2)
					.attr("x2", prev.x)
					.attr("y2", cp.y + 2)
					.attr("visibility", "visible");
			}
			else if (Math.abs(next.y - cp.y) <= 5){
				cp.y = next.y;
				this.g.svg.select('.graph-alignmentH')
					.attr("x1", cp.x)
					.attr("y1", cp.y + 2)
					.attr("x2", next.x)
					.attr("y2", cp.y + 2)
					.attr("visibility", "visible");
			}

			for (var id in links){
				links[id].redraw();
			}
		}
		this.e.update();
	}
	this.prevPos = this.newPos;
}

selectorEvent.prototype.up = function(event)
{
	if (!this.newPos){
		return;
	}
	Interface.selectedCorner = null;
	if (this.e.elem.type == 0){
		var newBox = this.e.elem.bBox();
		// if (this.e.elem.set){
		// 	newBox.width -= (2*this.e.elem.set_margin + 2*this.e.elem.set_width);
		// }
		this.e.elem.setBox(this.initialBox);
		this.g.ctrl.addAction(Action.resize, {e:this.e.elem, box:newBox});
		this.g.ctrl.run();
	}
	else if (this.e.elem.type == 1){
		var info = this.initialCP.split("_");
		//multilink centerPoint
		if (info[0] == 'center'){
			var actions = new Array();
			var links = this.g.relations[this.e.elem.hash()];
			for (var i in links){
				var link = links[i];
				link.x = this.initPos[0];
				link.y = this.initPos[1];
				actions.push([Action.move, {e:link, pos:this.newPos}]);
			}
			this.g.ctrl.addBatch(actions, 'MoveMlinkCenter');
			this.g.ctrl.run();
		}
		//Any other controlPoint
		else {
			var index = parseInt(info[2]);
			var links = this.g.relations[this.e.elem.hash()];
			var actions = new Array();
			for (var i in links){
				var link = links[i];
				var path = link.svg.select("."+info[0]);
				actions.push([Action.moveCorner, {d:path.attr('d'), path:path}]);
				path.attr('d', this.dInit[i]);
			}
			this.g.ctrl.addBatch(actions, 'MoveCorner');
			this.g.ctrl.run();
		}
	}
}

selectorEvent.prototype.over = function(event)
{

}

selectorEvent.prototype.out = function(event)
{

}
