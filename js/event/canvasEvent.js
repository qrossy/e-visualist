/**
 * Canvas Events
 * Code taken at https://simonsarris.com/making-html5-canvas-useful/
 * @constructor
 */
function CanvasEvent(graph) {
  var self = this;
  this.verbose = false;
  this.graph = graph;
  this.canvas = graph.canvas.node();

  this.scale = 1;
  this.translate = [0, 0];
  var graphZoom = function(event) {
    self.clear();
    self.draw();
  };
  graph.canvas.call(d3.behavior.zoom().on("zoom", graphZoom));
  this.ctx = this.canvas.getContext('2d');
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingLeft'], 10) || 0;
    this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingTop'], 10) || 0;
    this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderLeftWidth'], 10) || 0;
    this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderTopWidth'], 10) || 0;
  }
  this.dragging = false; // Keep track of when we are dragging
  this.clicked = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;

  this.canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);
  // Up, down, and move are for dragging
  this.canvas.addEventListener('mousedown', function(e) {
    if (self.verbose) log('Down');
    var pos = self.getMouse(e);
    self.clicked = self.getObjectAt(pos);
    if (self.clicked) {
      if (Interface.addingLink) {
        Interface.addingLink.from = self.clicked;
      } else {
        Interface.get().updateProperties(self.clicked);
        self.dragging = true;
        self.dragoffx = pos.x - self.clicked.x;
        self.dragoffy = pos.y - self.clicked.y;
      }
    }else{
      var div = Interface.get().popupDiv;
      $(div).fadeOut();
    }
    self.draw();

  }, true);
  this.canvas.addEventListener('mousemove', function(e) {
    if (self.verbose) log('Move');
    var pos = self.getMouse(e);
    if (self.dragging) {
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      self.clicked.x = pos.x - self.dragoffx;
      self.clicked.y = pos.y - self.dragoffy;
      self.draw();
      e.stopPropagation();
    } else if (Interface.addingLink && Interface.addingLink.from) {
      // draw links
      self.draw();
      self.ctx.strokeStyle = "#ccc";
      self.ctx.beginPath();
      var start = Interface.addingLink.from.getCenter();
      self.ctx.moveTo(start.x, start.y);
      self.ctx.lineTo(pos.x, pos.y);
      self.ctx.stroke();
      e.stopPropagation();
    }

  }, true);
  this.canvas.addEventListener('mouseup', function(e) {
    if (self.verbose) log('Up');
    self.dragging = false;
    var pos = self.getMouse(e);
    var target = self.getObjectAt(pos);
    if (target != self.clicked && Interface.addingLink) {
      Interface.createRelation(e, [Interface.addingLink.from, target]);
      self.draw();
      Interface.addingLink = false;
    } else if (self.clicked && event.which == 3) {
      self.nodePopup(e);
    }

  }, true);
  // double click for making new shapes
  this.canvas.addEventListener('dblclick', function(e) {
    var mouse = self.getMouse(e);
  }, true);
}

CanvasEvent.prototype.screenToCanvas = function(pos) {
  return pos.x ? {
    x: (pos.x - this.translate[0]) / this.scale,
    y: (pos.y - this.translate[0]) / this.scale
  } : [(pos[0] - this.translate[1]) / this.scale,
    (pos[1] - this.translate[1]) / this.scale
  ];
};

CanvasEvent.prototype.getObjectAt = function(pos) {
  //TODO optimize with selection on visible items and a treemap ?
  var shapes = this.graph.nodes;
  for (var id in shapes) {
    if (shapes[id].contains(pos.x, pos.y)) {
      var mySel = shapes[id];
      return mySel;
    }
  }
  return null;
};

CanvasEvent.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

CanvasEvent.prototype.draw = function() {
  log('CanvasRedraw');
  var ctx = this.ctx;
  ctx.save();
  this.clear();
  if (d3.event) {
    this.translate = d3.event.translate ? d3.event.translate : this.translate;
    this.scale = d3.event.scale ? d3.event.scale : this.scale;
  }
  ctx.translate(this.translate[0], this.translate[1]);
  ctx.scale(this.scale, this.scale);
  var nodes = this.graph.nodes;
  for (var n in nodes) {
    var node = nodes[n];
    // We can skip the drawing of elements that have moved off the screen:
    // if (node.x > this.width || node.y > this.height ||
    //   node.x + node.w < 0 || node.y + node.h < 0) continue;
    node.redraw();
  }
  var relations = this.graph.relations;
  for (var r in relations) {
    var group = relations[r];
    for (var g in group) {
      var rel = group[g];
      // We can skip the drawing of elements that have moved off the screen:
      // if (shape.x > this.width || shape.y > this.height ||
      //   shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
      rel.redraw();
    }
  }
  if (this.clicked != null) {
    this.clicked.selector.update();

  }
  ctx.restore();
};
// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasEvent.prototype.getMouse = function(e) {
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  var element = this.canvas,
    offsetX = 0,
    offsetY = 0,
    mx, my;

  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = (e.pageX - this.translate[0] - offsetX) / this.scale;
  my = (e.pageY - this.translate[1] - offsetY) / this.scale;

  // We return a simple javascript object (a hash) with x and y defined
  return {
    x: mx,
    y: my
  };
};

CanvasEvent.prototype.nodePopup = function(event) {
  var self = this;
  var div = Interface.get().popupDiv;
  $(div)
    .css("left", event.pageX - 115)
    .css("top", event.pageY)
    .css("width", "230px")
    .css("border", "1px solid #CCCCCC")
    .html("")
    .bind('contextmenu', function(event) {
      event.preventDefault();
    });
  var svg = d3.select("#visualist_popup")
    .append("svg:svg")
    .attr("width", 250)
    .attr("height", 40);

  //Icon
  svg.append("svg:image")
    .attr("xlink:href", this.clicked.icon)
    .attr("preserveAspectRatio", "xMinYMin")
    .attr("width", "22px")
    .attr("height", 22 * this.clicked.h / this.clicked.w + "px")
    .attr("x", 10)
    .attr("y", 10)
    .on('click', function() {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      Interface.entityType = 0;
      self.clicked.shape = 0;
      self.draw();
    });
  //Box
  svg.append("svg:rect")
    .attr("fill-opacity", 0)
    .attr("stroke", this.clicked.color)
    .attr("stroke-width", 1)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", 20)
    .attr("height", 20 * this.clicked.h / this.clicked.w)
    .attr("x", 40)
    .attr("y", 10)
    .on('click', function() {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      Interface.entityType = 1;
      self.clicked.shape = 1;
      self.draw();
    });
  //Circle
  svg.append("svg:circle")
    .attr("fill-opacity", 0)
    .attr("stroke", this.clicked.color)
    .attr("stroke-width", 1)
    .attr("r", 10)
    .attr("cx", 80)
    .attr("cy", 22)
    .on('click', function() {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      Interface.entityType = 2;
      self.clicked.shape = 2;
      self.draw();
    });
  //Set
  var m = 5,
    w = 7,
    h = 20,
    s = 10;
  var path = "M-" + m + ",0 Q-" + (m + w / 2) + ",0 -" + (m + w / 2) + "," + h / 4 + " T-" + (m + w) + "," + h / 2 + " ";
  path += "M-" + m + "," + h + " Q-" + (m + w / 2) + "," + h + " -" + (m + w / 2) + "," + h * 3 / 4 + " T-" + (m + w) + "," + h / 2 + "";
  path += "M" + (s + m) + ",0 Q" + (s + m + w / 2) + ",0 " + (s + m + w / 2) + "," + h / 4 + " T" + (s + m + w) + "," + h / 2 + " ";
  path += "M" + (s + m) + "," + h + " Q" + (s + m + w / 2) + "," + h + " " + (s + m + w / 2) + "," + h * 3 / 4 + " T" + (s + m + w) + "," + h / 2 + " ";
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
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      self.clicked.set = self.clicked.set ? false : true;
      self.draw();
    });
  svg.select('.set')
    .append("svg:path")
    .attr("fill-opacity", 0)
    .attr("stroke", this.clicked.color)
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr('d', path);
  //ThemeLine
  svg.append("svg:g")
    .attr("class", "theme")
    .append("svg:line")
    .attr("stroke", this.clicked.color)
    .attr("stroke-width", 2)
    .attr("x1", 190)
    .attr("y1", 25)
    .attr("x2", 210)
    .attr("y2", 25);
  svg.select('.theme')
    .append("svg:image")
    .attr("xlink:href", this.clicked.icon)
    .attr("preserveAspectRatio", "xMinYMin")
    .attr("width", "22px")
    .attr("height", 22 * this.clicked.h / this.clicked.w + "px")
    .attr("x", 180)
    .attr("y", 10)
    .on('click', function() {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      self.clicked.theme.draw = self.clicked.theme.draw ? false : true;
      self.draw();
    });

  var rColor = $('<span class="visualist_linkSelector_color">');
  var onColor = function(e) {
    e.preventDefault();
    if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
    self.clicked.color = this.title;
    self.draw();
    $('#FirstColorPicker a').css('border-color', '#ffffff');
    $(this).css('border-color', '#444444');
    svg.select('.theme').select('line').attr("stroke", this.title);
    svg.select('.set').select('path').attr("stroke", this.title);
    svg.select('rect').attr("stroke", this.title);
    svg.select('circle').attr("stroke", this.title);
  };
  for (var i in Interface.colors) {
    var color = Interface.colors[i];
    var c = $('<a href="#" title="' + color + '" style="background-color:' + color + '">&nbsp;&nbsp;&nbsp;</a>')
      .click(onColor);
    rColor.append(c);
  }
  div.append($('<div id="FirstColorPicker" style="text-align:center;">').append(rColor));

  var wDiv = $('<div style="margin-left:5px;margin-top:5px;">');
  wDiv.append('<input type="text" id="node-width" size="1" style="float:right;margin-top:-3px;"/>');
  wDiv.append('<div id="slider-width" style="width:185px;margin-left:3px;margin-bottom:5px;"></div>');
  div.append(wDiv);
  $('#slider-width').slider({
    orientation: "horizontal",
    range: "min",
    min: 5,
    max: 200,
    step: 5,
    value: self.clicked.w,
    slide: function(event, ui) {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      $("#node-width").val(ui.value);
      self.clicked.h = ui.value * self.clicked.h / self.clicked.w;
      self.clicked.w = ui.value;
      self.draw();
    }
  });

  $("#node-width").val($("#slider-width").slider("value"));

  $(div).show();
};
