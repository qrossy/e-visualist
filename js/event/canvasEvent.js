/**
 * Canvas Events
 * Code taken at https://simonsarris.com/making-html5-canvas-useful/
 * @constructor
 */
function CanvasEvent(graph) {
  var self = this;
  this.verbose = true;
  this.graph = graph;
  this.canvas = graph.canvas.node();
  this.visibleEntities = {
    nodes: [],
    relations: []
  }; //storeVisible entities on redraw to optimise selections
  this.scale = 1;
  this.translate = [0, 0];
  var graphZoom = function(event) {
    self.clear();
    self.clicked = null;
    self.setViewport();
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

  this.canvas.addEventListener('mousedown', function(e) {
    if (self.verbose) log('Down');
    var pos = self.screenToCanvas(e);
    self.clicked = self.getObjectAt(pos);
    if (self.clicked) {
      if (Interface.addingLink) {
        if (self.verbose) log('adding Link');
        Interface.addingLink.from = self.clicked;
        self.addingLinkStartPos = pos;
      } else {
        Interface.get().updateProperties(self.clicked);
        self.dragging = true;
        self.dragoffx = pos.x - self.clicked.x;
        self.dragoffy = pos.y - self.clicked.y;
      }
      //on dragging we redraw only the clicked node (the rest is stored in a image in draw)
      //on mouse down, we need to redraw all to get the image without the clicked entity
      self.draw();
      self.drawClicked();
    } else {
      var div = Interface.get().popupDiv;
      $(div).fadeOut();
    }
  }, true);


  this.canvas.addEventListener('mousemove', function(e) {
    if (self.verbose) log('Move');
    var pos = self.screenToCanvas(e);

    //TODO handling dragging outside of the canvas ... block and panning ?
    if (self.dragging) {
      e.stopPropagation();
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      self.clicked.x = pos.x - self.dragoffx;
      self.clicked.y = pos.y - self.dragoffy;
      //we redraw only the clicked node (the rest is stored in a image during draw)
      self.drawClicked();
    } else if (Interface.addingLink && Interface.addingLink.from) {
      e.stopPropagation();
      self.drawClicked();
      // draw moving line on AddLink
      self.ctx.save();
      self.ctx.translate(self.translate[0], self.translate[1]);
      self.ctx.scale(self.scale, self.scale);
      self.ctx.strokeStyle = "#ccc";
      self.ctx.moveTo(self.addingLinkStartPos.x, self.addingLinkStartPos.y);
      self.ctx.lineTo(pos.x, pos.y);
      self.ctx.stroke();
      self.ctx.restore();
    }

  }, true);
  this.canvas.addEventListener('mouseup', function(e) {
    if (self.verbose) log('Up');
    self.dragging = false;
    var pos = self.screenToCanvas(e);
    var target = self.getObjectAt(pos);
    if (target != self.clicked && Interface.addingLink) {
      Interface.createRelation(e, [Interface.addingLink.from, target]);
      self.draw();
      self.drawClicked();
      Interface.addingLink = false;
    } else if (self.clicked && event.which == 3) {
      if (self.clicked.type == 0) {
        self.nodePopup(e);
      }
      if (self.clicked.type == 1) {
        self.linkPopup(e);
      }
    }

  }, true);
  // double click
  this.canvas.addEventListener('dblclick', function(e) {
    //nothing to do now
  }, true);
}

CanvasEvent.prototype.draw = function() {
  if (self.verbose) log('CanvasRedraw');
  this.visibleEntities = {
    nodes: [],
    relations: []
  };
  var ctx = this.ctx;
  ctx.save();
  this.clear();
  if (d3.event) {
    this.translate = d3.event.translate ? d3.event.translate : this.translate;
    this.scale = d3.event.scale ? d3.event.scale : this.scale;
  }
  ctx.translate(this.translate[0], this.translate[1]);
  ctx.scale(this.scale, this.scale);
  var relations = this.graph.relations;
  for (var r in relations) {
    var group = relations[r];
    for (var g in group) {
      var rel = group[g];
      if (this.clicked != null) {
        //relations of clicked node are drawn at the end !
        if (this.clicked.id in rel.connect || this.clicked.id == rel.id) {
          this.visibleEntities.relations.push(rel);
          continue;
        }
      }
      //we only draw visible relations
      if (this.inViewport(rel)) {
        rel.redraw();
        this.visibleEntities.relations.push(rel);
      }
    }
  }
  var nodes = this.graph.nodes;
  for (var n in nodes) {
    var node = nodes[n];
    // clicked node is drawn at the end ad only visible nodes are drown
    if (node != this.clicked && this.inViewport(node)) {
      node.redraw();
      this.visibleEntities.nodes.push(node);
    }
  }
  this.canvasData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  ctx.restore();
};

CanvasEvent.prototype.drawClicked = function() {
  if (self.verbose) log('ClickedRedraw');
  //redraw canvas image
  this.ctx.putImageData(this.canvasData, 0, 0);
  //draw clicked entity
  var ctx = this.ctx;
  ctx.save();
  if (d3.event) {
    this.translate = d3.event.translate ? d3.event.translate : this.translate;
    this.scale = d3.event.scale ? d3.event.scale : this.scale;
  }
  ctx.translate(this.translate[0], this.translate[1]);
  ctx.scale(this.scale, this.scale);
  this.clicked.redraw();
  //add clicked entity to visibleEntities
  if (this.clicked.type == 0) {
    this.visibleEntities.nodes.push(this.clicked);
  } else {
    this.visibleEntities.relations.push(this.clicked);
  }
  //redraw relations if entity is a node
  if (this.clicked.type == 0) {
    this.clicked.updateConnect();
  }
  //draw selector
  this.clicked.selector.update();
  ctx.restore();
};

//clear the canvas
CanvasEvent.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

//Find entity based on position
CanvasEvent.prototype.getObjectAt = function(pos) {
  var nodes = this.visibleEntities.nodes;
  if (!nodes) {
    return null;
  }
  for (var id in nodes) {
    var node = nodes[id];
    if (node.contains(pos.x, pos.y)) {
      return node;
    }
  }
  var relations = this.visibleEntities.relations;
  if (!relations) {
    return null;
  }
  for (var r in relations) {
    var rel = relations[r];
    if (rel.type == 1) { // this is a link
      var path = rel.svg.select('.mainPath').node();
      var pathSource = rel.svg.select('.e' + rel.source.id).node();
      var pathTarget = rel.svg.select('.e' + rel.target.id).node();
      var bestSource = closestPoint(pathSource, pos);
      var bestTarget = closestPoint(pathTarget, pos);
      var dist = rel.width;
      if (dist <= 5) {
        dist = 5;
      }
      if (bestSource.distance <= dist || bestTarget.distance <= dist) {
        return rel;
      }
    }
  }
  return null;
};

//Check if entity in viewport
CanvasEvent.prototype.inViewport = function(entity) {
  var entityBox = entity.bBox();
  if (
    entityBox.x + entityBox.width >= this.start.x &&
    entityBox.x <= this.end.x &&
    entityBox.y + entityBox.height >= this.start.y &&
    entityBox.y <= this.end.y
  ) {
    return true;
  }
  return false;
};

//set the visible area in canvas coordinates
CanvasEvent.prototype.setViewport = function() {
  this.start = this.getOffset();
  this.end = this.screenToCanvas({
    x: this.start.x + this.canvas.width,
    y: this.start.y + this.canvas.height
  });
  this.start = this.screenToCanvas(this.start);
};

// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasEvent.prototype.screenToCanvas = function(e) {
  var offset = this.getOffset();
  var x;
  var y;
  if (e.pageX) {
    x = e.pageX;
    y = e.pageY;
  } else {
    x = e.x;
    y = e.y;
  }
  mx = (x - this.translate[0] - offset.x) / this.scale;
  my = (y - this.translate[1] - offset.y) / this.scale;
  // We return a simple javascript object (a hash) with x and y defined
  return {
    x: mx,
    y: my
  };
};

CanvasEvent.prototype.getOffset = function(e) {
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
  return {
    x: offsetX,
    y: offsetY
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
      self.drawClicked();
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
      self.drawClicked();
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
      self.drawClicked();
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
      self.drawClicked();
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
      self.drawClicked();
    });

  var rColor = $('<span class="visualist_linkSelector_color">');
  var onColor = function(e) {
    e.preventDefault();
    if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
    self.clicked.color = this.title;
    self.drawClicked();
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
      self.drawClicked();
    }
  });

  $("#node-width").val($("#slider-width").slider("value"));

  $(div).show();
};


CanvasEvent.prototype.linkPopup = function(event) {
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
    .attr("height", 100);

  var source = this.clicked.svg.select(".e" + this.clicked.source.id).node();
  var target = this.clicked.svg.select(".e" + this.clicked.target.id).node();
  var segments = source.getPathData();
  var v = Link.vector(segments.getItem(1), segments.getItem(segments.length - 1));
  var createLine = function(from, to) {
    var line = svg.append("svg:g");
    line.append("svg:path")
      .attr("class", "ground")
      .attr("fill-opacity", 0)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 15)
      .attr("stroke", "#ffffff")
      .attr("d", "M" + from + " L" + to);
    line.append("svg:path")
      .attr("class", "arrow")
      .attr("fill-opacity", 0)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 2)
      .attr("stroke", "black")
      .attr("d", "M" + from + " L" + to);
    return line;
  };

  var dist = 4; // ArrowLength
  var space = 5; // ArrowSpace
  var drawArrow = function(point, reverse) {
    if (reverse) dist = -dist;
    var d = " M" + (point.x + dist * v.ux() + (space * v.uy())) + "," + (point.y + dist * v.uy() + (-space * v.ux()));
    d += " L" + point.x + "," + point.y;
    d += " L" + (point.x + dist * v.ux() - (space * v.uy())) + "," + (point.y + dist * v.uy() - (-space * v.ux()));
    return d;
  };

  var s = 10;
  var margin = 15;
  var c = {
    x: s + margin + 5,
    y: s + margin
  };
  for (var i = 1; i < 5; i++) {
    var line = createLine((c.x - s * v.ux()) + "," + (c.y - s * v.uy()), (c.x + s * v.ux()) + "," + (c.y + s * v.uy()));
    if (i == 1) {
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = null;
        self.clicked.arrowOthers = false;
        if (self.clicked.space != 0) {
          self.clicked.removeMainPath();
        }
        self.drawClicked();
        $(this).parent().find('.arrow').each(function() {
          $(this).attr("stroke", "black");
        });
        $(this).find('.arrow').attr("stroke", "red");
        if (self.clicked.connectCount() == 2) {
          $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');
          $('#SecondColorPicker').hide();
        }
      });
      if (self.clicked.arrow == null) line.select(".arrow").attr("stroke", "red");
    }
    if (i == 2) {
      var point = {
        x: (c.x - s * v.ux()),
        y: (c.y - s * v.uy())
      };
      var d = drawArrow(point);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d);
      var id = $(target).attr('class').split("e")[1];
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = id;
        self.clicked.arrowOthers = false;
        if (self.clicked.space != 0) {
          self.clicked.removeMainPath();
        }
        self.drawClicked();
        $(this).parent().find('.arrow').each(function() {
          $(this).attr("stroke", "black");
        });
        $(this).find('.arrow').attr("stroke", "red");
        if (self.clicked.connectCount() == 2) {
          $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');
          $('#SecondColorPicker').hide();
        }
      });
      if (self.clicked.arrow == id && !self.clicked.arrowOthers) line.select(".arrow").attr("stroke", "red");
    } else if (i == 3) {
      var point = {
        x: (c.x + s * v.ux()),
        y: (c.y + s * v.uy())
      };
      var d = drawArrow(point, true);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d);
      var id = $(target).attr('class').split("e")[1];
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = id;
        self.clicked.arrowOthers = true;
        if (self.clicked.space != 0) {
          self.clicked.removeMainPath();
        }
        self.drawClicked();
        $(this).parent().find('.arrow').each(function() {
          $(this).attr("stroke", "black");
        });
        $(this).find('.arrow').attr("stroke", "red");
        if (self.clicked.connectCount() == 2) {
          $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');
          $('#SecondColorPicker').hide();
        }
      });
      if ((!self.clicked.arrowOthers && self.clicked.arrow != id && self.clicked.arrow != null && self.clicked.arrow != self.clicked.id) || (self.clicked.arrowOthers && self.clicked.arrow == id)) line.select(".arrow").attr("stroke", "red");
    } else if (i == 4) {
      var point = {
        x: c.x,
        y: c.y
      };
      var d1 = drawArrow(point);
      var d2 = drawArrow(point, true);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d1 + d2);
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = self.clicked.id;
        self.clicked.arrowOthers = false;
        if (self.clicked.space != 0) {
          self.clicked.addMainPath();
        }
        self.drawClicked();
        $(this).parent().find('.arrow').each(function() {
          $(this).attr("stroke", "black");
        });
        $(this).find('.arrow').attr("stroke", "red");
        if (self.clicked.connectCount() == 2) {
          $(this).parent().find('.ratio-ctrl').attr("visibility", 'visible');
          $('#SecondColorPicker').show();
        }
      });
      if (self.clicked.arrow == self.clicked.id) line.select(".arrow").attr("stroke", "red");

    }
    c.x += s + margin;
  }
  var width = 80;
  var dasharray = [null, '10,5', '3,4', '1,3'];
  var i = 0;
  c.x += margin;
  for (var d in dasharray) {
    var pattern = dasharray[d];
    var line = createLine((c.x) + "," + (c.y - 15 + i * 10), (c.x + width) + "," + (c.y - 15 + i * 10));
    line.select('.arrow').attr("stroke-dasharray", pattern);
    line.on('mouseup', function() {
      if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
      self.clicked.dasharray = null;
      var dashString = $(this).find('.arrow').attr("stroke-dasharray");
      if (dashString) self.clicked.dasharray = dashString.split(",");
      self.drawClicked();
      $(this).parent().find('.arrow').each(function() {
        $(this).attr("stroke", "black");
      });
      $(this).find('.arrow').attr("stroke", "red");
    });
    if (self.clicked.dasharray == pattern) line.select(".arrow").attr("stroke", "red");
    i += 1;
  }
  c.x += width + 5;
  svg.attr("width", c.x).attr("height", c.y + s + margin);

  //widthSlider
  svgSlider(svg, 0, 0, "width", 1, 35, 1, "width", self.clicked);

  if (this.clicked.connectCount() == 2) {
    var ratioSvg = svg.append("svg:foreignObject")
      .attr("x", 120)
      .attr("y", 0)
      .attr("width", 20)
      .attr("height", 70)
      .attr("class", "ratio-ctrl")
      .attr("visibility", this.clicked.arrow == this.clicked.id ? 'visible' : 'hidden');
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
      value: self.clicked.ratio,
      slide: function(event, ui) {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        $("#ratio").val(ui.value);
        self.clicked.ratio = ui.value;
        self.drawClicked();
      }
    });
    $("#ratio").val($("#slider-ratio").slider("value"));
  }


  var onFirstColor = function(e) {
    e.preventDefault();
    if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
    self.clicked.color = this.title;
    self.drawClicked();
    $('#FirstColorPicker a').css('border-color', '#ffffff');
    $(this).css('border-color', '#444444');
  };

  var onSecondColor = function(e) {
    e.preventDefault();
    if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
    self.clicked.secondColor = this.title;
    self.drawClicked();
    $('#SecondColorPicker a').css('border-color', '#ffffff');
    $(this).css('border-color', '#444444');
  };

  var firstColorDiv = $('<div id="FirstColorPicker" style="text-align:center;margin-top:2px;">');
  var secondColorDiv = $('<div id="SecondColorPicker" style="text-align:center;">');
  var firstColorSpan = $('<span class="visualist_linkSelector_color">');
  var secondColorSpan = $('<span class="visualist_linkSelector_color">');

  for (var index in Interface.colors) {
    var color = Interface.colors[index];
    var c1 = $('<a href="#" title="' + color + '" style="background-color:' + color + '">&nbsp;&nbsp;&nbsp;</a>')
      .click(onFirstColor);
    firstColorSpan.append(c1);
    var c2 = $('<a href="#" title="' + color + '" style="background-color:' + color + '">&nbsp;&nbsp;&nbsp;</a>')
      .click(onSecondColor);
    secondColorSpan.append(c2);
  }
  firstColorDiv.append(firstColorSpan);
  div.append(firstColorDiv);
  secondColorDiv.append(secondColorSpan);
  div.append(secondColorDiv);
  if (!(this.clicked.connectCount() == 2 && this.clicked.arrow == this.clicked.id)) {
    secondColorDiv.hide();
  }

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
  // var data = self.clicked.getData();
  // self.g.ctrl.addAction(Action.removeEntity, {e:self.clicked, g:self.g});
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
