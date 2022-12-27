graphEvent.prototype.toString = function()
{
  return "graphEvent";
};

function graphEvent(graph)
{
  this.parent = visEvent;
  this.parent(graph, graph);

  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.listeners = [];
  this.pan = null;
  this.zoom = 0;
  this.translate = 0;
  this.initPos = [0, 0];
  this.prevPos = null;
  this.newPos = null;
  this.nodes = false;
  this.hideLabels = false;
  this.stopProp = false;

  var self = this;
  var graphZoom = function(event) {
  if (self.verbose) log(self.toString()+' Zoom');
  if (!event){
  event = d3.event;
  }
  self.onZoom(event);
};
  this.g.svg.call(d3.behavior.zoom().on("zoom", graphZoom));
}

graphEvent.prototype.down = function(event)
{
  this.nodes = false;
  this.initPos = [event.pageX, event.pageY];
  this.prevPos = this.initPos;
  if (Interface.modifiedEntity){
    var entity = g.get(Interface.modifiedEntity.id);
    var data = entity.getData();
    entity.setData(Interface.modifiedEntity);
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
  var targetClass = $(event.target).attr('class');
  var ground = ['svg-droppable', 'grid'];
  if (!targetClass){ }

  if (event.which == 3 && ground.includes(targetClass)){
    Interface.padding = true;
    document.body.style.cursor = '-moz-grab';
    this.pan = {
    x0: this.x - event.pageX,
    y0: this.y - event.pageY,
    };
  }
  else if (ground.includes(targetClass)){
    this.g.hideHelpers();
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
};

graphEvent.prototype.move = function(event)
{
  this.zoom = null;
  this.newPos = [event.pageX, event.pageY];
  if (this.pan){
    // document.body.style.cursor = '-moz-grabbing';
    if ($("#visualist_timebar").is(':visible')){
      Interface.timebar.getBand(0)._moveEther((this.newPos[0]-this.prevPos[0]));
    }
    this.x = event.pageX + this.pan.x0;
    this.y = event.pageY + this.pan.y0;
    if (g.snapToGrid){
      var snap = g.snap([this.x,this.y]);
      this.x = snap[0];
      this.y = snap[1];
    }
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
  if (!this.pan){event.stopPropagation();}
};

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
    if (Interface.addingLink && this.nodes.length > 1){
      Interface.createRelation(event, this.nodes);
    }
  }
  $(".visualist_linkSelector_type").find('input').each(function(){
    $(this).attr('checked', false);
    $(this).button('refresh');
  });
  var elemClass = $(event.target).parent('g').attr('class');
  if (elemClass != 'nodeEntity'){
    Interface.addingLink = false;
    g.svg.select(".tempLink").remove();
    document.body.style.cursor = 'default';
  }
};

graphEvent.prototype.over = function(event)
{

};

graphEvent.prototype.out = function(event)
{

};

graphEvent.prototype.onZoom = function(event) {
  var z = event.scale;
  if (z <= 0.3 && !this.hideLabels){
    g.svg.selectAll('foreignObject').each(function() {$(this).attr("visibility", "hidden");});
    if (this.g.gridVisible){
      g.svg.selectAll('.grid').each(function() {$(this).attr("visibility", "hidden");});
    }
    g.svg.selectAll('path').each(function() {$(this).attr("shape-rendering", "crispEdges");});
    g.svg.selectAll('image').each(function() {$(this).attr("image-rendering", "optimize-speed");});
    this.hideLabels = true;
  }
  else if (z >= 0.3 && this.hideLabels){
    g.svg.selectAll('foreignObject').each(function() {$(this).attr("visibility", "visible");});
    if (this.g.gridVisible){
      g.svg.selectAll('.grid').each(function() {$(this).attr("visibility", "visible");});
    }
    g.svg.selectAll('path').each(function() {$(this).attr("shape-rendering", "geometric-precision");});
    g.svg.selectAll('image').each(function() {$(this).attr("image-rendering", "optimize-quality");});
    this.hideLabels = false;
  }

  this.g.main.node().transform.baseVal.getItem(0).matrix.e = event.translate[0];
  this.g.main.node().transform.baseVal.getItem(0).matrix.f = event.translate[1];
  if (event.pan){
    return;
  }

  this.g.main.node().transform.baseVal.getItem(0).matrix.a = event.scale;
  this.g.main.node().transform.baseVal.getItem(0).matrix.d = event.scale;
  this.g.svg.select("#gridPattern").attr("width", this.g.gridSize*event.scale);
  this.g.svg.select("#gridPattern").attr("height", this.g.gridSize*event.scale);

  if ($("#visualist_timebar").length == 0 || $("#visualist_timebar").is(':hidden')){
    return;
  }

  Interface.padding = true; //Prevent TimeBar to update Graph during ScrollEvent
  var staticDate = Interface.timebar.getBand(0)._ether.pixelOffsetToDate(event.x);
  Interface.timeBarParams.intervalPixels = Interface.timeBarParams.fixInterval*event.scale;
  Interface.UpdateTimebar(this.g.timeZones);
  var newStaticDatePos = Interface.timebar.getBand(0)._ether.dateToPixelOffset(staticDate);
  Interface.timebar.getBand(0)._moveEther(event.x - newStaticDatePos);
  Interface.padding = false;
};
