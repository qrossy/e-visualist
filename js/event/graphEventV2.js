graphEvent.prototype.toString = function()
{
	return "graphEvent";
}

function graphEvent(graph)
{
  this.parent = visEvent;
  this.parent(graph, graph);
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.listeners = [];
  this.pan;
  this.zoom;
  this.translate;
  this.initPos = [0, 0];
  this.prevPos;
  this.newPos;
  this.verbose = false;
  this.nodes = false;
  this.hideLabels = false;
}

graphEvent.prototype.down = function(event)
{
  this.nodes = false
  this.initPos = [event.pageX, event.pageY];
  this.prevPos = this.initPos;
  if (Interface.modifiedEntity){
    var entity = g.get(Interface.modifiedEntity.id);
    var data = entity.getData();
    entity.setData(Interface.modifiedEntity);
    entity.redraw();
    entity.redrawLabels();
    this.g.ctrl.addAction(Action.change, {e:entity, data:data});
    this.g.ctrl.run();
    Interface.modifiedEntity = null;
  }
  if (Interface.modifiedLabel){
    var html = Interface.modifiedLabel.getHtml();
    Interface.modifiedLabel.setHtml(Interface.modifiedLabel.oldLabel);
    this.g.ctrl.addAction(Action.changeLabel, {l:Interface.modifiedLabel, txt:html});
    this.g.ctrl.run();
    Interface.modifiedLabel = null;
  }
  var div = Interface.get().popupDiv;
  $(div).fadeOut();
  //Added to catch the offset of a TimeBar translate
  x = this.g.main.node().transform.baseVal.getItem(0).matrix.e;

	log(event.target.tagName);
  if (event.which == 3 && event.target.tagName == 'svg'){
    Interface.padding = true;
    document.body.style.cursor = '-moz-grab';
    this.pan = {
      x0: this.x - event.clientX,
      y0: this.y - event.clientY,
    };
  }
  else if (event.target.tagName == 'svg'){
    this.g.hideHelpers();
    event.e == null;
    Interface.get().updateProperties(event);
    var pos = g.pos(this.initPos[0], this.initPos[1]);
    this.g.svg.select(".graph-selector")
      .attr("x", pos[0])
      .attr("y", pos[1])
      .attr("width", 0)
      .attr("height", 0)
      .attr('visibility', 'visible');
  }
    event.preventDefault();
}
graphEvent.prototype.move = function(event)
{
  this.zoom = null;
	this.newPos = [event.pageX, event.pageY];
	if (this.pan){
		// document.body.style.cursor = '-moz-grabbing';
		if ($("#visualist_timebar").is(':visible')){
			Interface.timebar.getBand(0)._moveEther((this.newPos[0]-this.prevPos[0]));
		}
		this.x = event.clientX + this.pan.x0;
		this.y = event.clientY + this.pan.y0;
	}
	else if (this.g.svg.select(".graph-selector").attr('visibility') == 'visible'){

		var selector = this.g.svg.select(".graph-selector");
		var w = this.newPos[0]-this.initPos[0];
		var h = this.newPos[1]-this.initPos[1];
		var pos = this.g.pos(this.newPos[0], this.newPos[1]);
		if (this.newPos[0] < this.initPos[0]){
			selector.attr("x", pos[0]);
			w = this.initPos[0]-this.newPos[0];
		}
		if (this.newPos[1] < this.initPos[1]){
			selector.attr("y", pos[1]);
			h = this.initPos[1]-this.newPos[1];
		}
		this.g.hideSelector();
		selector.attr("width", w/this.g.scale()).attr("height", h/this.g.scale());
		var box = [
			this.g.pos(Math.min(this.initPos[0], this.newPos[0]),Math.min(this.initPos[1], this.newPos[1])),
			this.g.pos(Math.max(this.initPos[0], this.newPos[0]),Math.max(this.initPos[1], this.newPos[1]))
		];
		this.nodes = this.g.getNodes(box);
		for (var n in this.nodes){
			this.nodes[n].selector.update();
		}
	}
	this.prevPos = this.newPos;
}

graphEvent.prototype.up = function(event)
{
  if (this.pan) {
    this.move(event);
    this.pan = null;
  }

  Interface.padding = false;
  document.body.style.cursor = 'default';
  this.g.svg.select(".graph-selector").attr('visibility', 'hidden');
  $('.visualist_linkSelector a').css('border-color','#ffffff');

  if (this.newPos){
    this.prevPos = false;
    if (Interface.addingLink && nodes.length > 1){
      Interface.createRelation(event, this.nodes);
    }
  }
  $(".visualist_linkSelector_type").find('input').each(function(){
    $(this).attr('checked', false);
    $(this).button('refresh');
  });
  Interface.addingLink = false;
}

graphEvent.prototype.over = function(event)
{

}

graphEvent.prototype.out = function(event)
{

}
