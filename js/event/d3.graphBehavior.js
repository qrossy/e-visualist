(function(){d3.behavior = {};
// TODO unbind zoom behavior?
// TODO unbind listener?
d3.behavior.zoom = function(graph) {

  var x = 0,
      y = 0,
      z = 0,
	  g = graph,
      listeners = [],
      pan,
      zoom,
	  initPos = [0, 0],
	  prevPos,
	  newPos,
	  verbose = false,
	  nodes = false,
	  hideLabels = false;

  function zoom() {
    var container = this
        .on("mousedown", mousedown)
        .on("mousewheel", mousewheel)
        .on("DOMMouseScroll", mousewheel)
        .on("dblclick", mousewheel);

    d3.select(window)
        .on("mousemove", mousemove)
        .on("mouseup", mouseup);
  }

  function mousedown(d, i) {
	if (verbose) log('Graph Down');
	nodes = false
	initPos = [d3.event.pageX, d3.event.pageY];
	prevPos = initPos;
	if (Interface.modifiedEntity){
		var entity = g.get(Interface.modifiedEntity.id);
		var data = entity.getData();
		entity.setData(Interface.modifiedEntity);
		entity.redraw();
		entity.redrawLabels();
		g.ctrl.addAction(Action.change, {e:entity, data:data});
		g.ctrl.run();
		Interface.modifiedEntity = null;
		//Interface.get().setKeyEvents();
	}
	if (Interface.modifiedLabel){
		var html = Interface.modifiedLabel.getHtml();
		Interface.modifiedLabel.setHtml(Interface.modifiedLabel.oldLabel);
		g.ctrl.addAction(Action.changeLabel, {l:Interface.modifiedLabel, txt:html});
		g.ctrl.run();
		Interface.modifiedLabel = null;
	}
	var div = Interface.get().popupDiv;
	$(div).fadeOut();
	//Added to catch the offset of a TimeBar translate
	x = g.main.node().transform.baseVal.getItem(0).matrix.e;
	
	if (d3.event.which == 3 && d3.event.target.tagName == 'svg'){
		Interface.padding = true;
		document.body.style.cursor = '-moz-grab';
		pan = {
		  x0: x - d3.event.clientX,
		  y0: y - d3.event.clientY,
		  target: this,
		  data: d,
		  index: i
		};
	}
	else if (d3.event.target.tagName == 'svg'){
		g.hideHelpers();
		d3.event.e == null;
		Interface.get().updateProperties(d3.event);
		var pos = g.pos(initPos[0], initPos[1]);
		g.svg.select(".graph-selector")
			.attr("x", pos[0])
			.attr("y", pos[1])
			.attr("width", 0)
			.attr("height", 0)
			.attr('visibility', 'visible');
	}
    d3.event.preventDefault();
    //window.focus(); // TODO focusableParent
  }

  function mousemove() {
	// if (d3.event.target.tagName == 'svg'){
		// document.body.style.cursor = 'default';
	// }
	if (verbose){ log('Graph Move');}
    zoom = null;
	newPos = [d3.event.pageX, d3.event.pageY];
	if (pan){
		document.body.style.cursor = '-moz-grabbing';
		if ($("#visualist_timebar").is(':visible')){
			Interface.timebar.getBand(0)._moveEther((newPos[0]-prevPos[0]));
		}
		x = d3.event.clientX + pan.x0;
		y = d3.event.clientY + pan.y0;
		dispatch.call(pan.target, pan.data, pan.index);
	}
	else if (g.svg.select(".graph-selector").attr('visibility') == 'visible'){
		var selector = g.svg.select(".graph-selector");
		var w = newPos[0]-initPos[0];
		var h = newPos[1]-initPos[1];
		var pos = g.pos(newPos[0], newPos[1]);
		if (newPos[0] < initPos[0]){
			selector.attr("x", pos[0]);
			w = initPos[0]-newPos[0];
		}
		if (newPos[1] < initPos[1]){
			selector.attr("y", pos[1]);
			h = initPos[1]-newPos[1];
		}
		g.hideSelector();
		selector.attr("width", w/g.scale()).attr("height", h/g.scale());
		var box = [
			g.pos(Math.min(initPos[0], newPos[0]),Math.min(initPos[1], newPos[1])),
			g.pos(Math.max(initPos[0], newPos[0]),Math.max(initPos[1], newPos[1]))
		];
		nodes = g.getNodes(box);
		for (var n in nodes){
			nodes[n].selector.update();
		}
	}
	prevPos = newPos;
  }

  function mouseup() {
	if (verbose) log('Graph Up');
    if (pan) {
      mousemove();
      pan = null;
    }
	
	Interface.padding = false;
	document.body.style.cursor = 'default';
	g.svg.select(".graph-selector").attr('visibility', 'hidden');
	$('.visualist_linkSelector a').css('border-color','#ffffff');
	
	if (newPos){
		prevPos = false;
		if (Interface.addingLink && nodes.length > 1){
			Interface.createRelation(d3.event, nodes);
		}
	}
	$(".visualist_linkSelector_type").find('input').each(function(){
		$(this).attr('checked', false);
		$(this).button('refresh');
	});
	Interface.addingLink = false;
  }

  // mousewheel events are totally broken!
  // https://bugs.webkit.org/show_bug.cgi?id=40441
  // not only that, but Chrome and Safari differ in re. to acceleration!

  var outer = d3.select("body").append("div")
      .style("visibility", "hidden")
      .style("position", "absolute")
      .style("top", "-3000px")
      .style("height", 0)
      .style("overflow-y", "scroll")
    .append("div")
      .style("height", "2000px")
    .node().parentNode;

  function mousewheel(d, i) {
    var e = d3.event;
    // initialize the mouse location for zooming (to avoid drift)
    if (!zoom) {
      var p = d3.mouse(this.nearestViewportElement || this);
	  //Added to catch the offset of a TimeBar translate
	  x = g.main.node().transform.baseVal.getItem(0).matrix.e;
      zoom = {
        x0: x,
        y0: y,
        z0: z,
        x1: x - p[0],
        y1: y - p[1]
      };
    }

    // adjust zoom level
    if (e.type === "dblclick") {
      z = e.shiftKey ? Math.ceil(z - 1) : Math.floor(z + 1);
    } else {
      var delta = e.wheelDelta || -e.detail;
      if (delta) {
        try {
          outer.scrollTop = 1000;
          outer.dispatchEvent(e);
          delta = 1000 - outer.scrollTop;
        } catch (error) {
          // Derp! Hope for the best?
        }
        delta *= .05;
      }
      z += delta;
    }
	if (z <= -1.5 && !hideLabels){
		g.svg.selectAll('foreignObject').each(function() {$(this).attr("visibility", "hidden");});
		//g.svg.selectAll('path').each(function() {$(this).attr("shape-rendering", "crispEdges");});
		//g.svg.selectAll('image').each(function() {$(this).attr("image-rendering", "optimize-speed");});
		hideLabels = true;
	}
	else if (z >= -1.5 && hideLabels){
		g.svg.selectAll('foreignObject').each(function() {$(this).attr("visibility", "visible");});
		//g.svg.selectAll('path').each(function() {$(this).attr("shape-rendering", "geometric-precision");});
		//g.svg.selectAll('image').each(function() {$(this).attr("image-rendering", "optimize-quality");});
		hideLabels = false;
	}
    // adjust x and y to center around mouse location
    var k = Math.pow(2, z - zoom.z0) - 1;
    x = zoom.x0 + zoom.x1 * k;
    y = zoom.y0 + zoom.y1 * k;

    // dispatch redraw
    dispatch.call(this, d, i);
  }

  function dispatch(d, i) {
    var o = d3.event, // Events can be reentrant (e.g., focus).
        k = Math.pow(2, z);
    d3.event = {
	  x: d3.event.layerX,
      scale: k,
	  pan: pan ? true : false,
      translate: [x, y],
      transform: function(sx, sy) {
        if (sx) transform(sx, x);
        if (sy) transform(sy, y);
      }
    };

    function transform(scale, o) {
      var domain = scale.__domain || (scale.__domain = scale.domain()),
          range = scale.range().map(function(v) { return (v - o) / k; });
      scale.domain(domain).domain(range.map(scale.invert));
    }

    try {
      for (var j = 0, m = listeners.length; j < m; j++) {
        listeners[j].call(this, d, i);
      }
    } finally {
      d3.event = o;
    }
  }

  zoom.on = function(type, listener) {
    if (type == "zoom") listeners.push(listener);
    return zoom;
  };

  return zoom;
};
})();
