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
    } else {
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
      if (self.clicked.type == 0){
        self.nodePopup(e);
      }
      if (self.clicked.type == 1){
        self.linkPopup(e);
      }
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
      return shapes[id];
    }
  }
  var relations = this.graph.relations;
  for (var r in relations) {
    var group = relations[r];
    for (var g in group) {
      var rel = group[g];
      if (rel.type == 1) { // this is a link
        var path = rel.svg.select('.mainPath').node();
        var pathSource = rel.svg.select('.e' + rel.source.id).node();
        var pathTarget = rel.svg.select('.e' + rel.target.id).node();
        var bestSource = closestPoint(pathSource, pos);
        var bestTarget = closestPoint(pathTarget, pos);
        if (bestSource.distance <= 5 || bestTarget.distance <= 5) {
          return rel;
        }
        // var path = rel.canvasPath2D;
        // var ctx = rel.g.context;
        // if (ctx.isPointInPath(path, pos.x, pos.y)) {
        //   log('hit Link');
        //   return relations[r];
        // }
      }
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
  var path = this.clicked.svg.select(".mainPath").node();
  var target = this.clicked.svg.select(".e"+this.clicked.target.id).node();
  var segments = this.clicked.main ? path.getPathData() : target.getPathData();
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
  var arrow = function(point, reverse) {
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
        self.draw();
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
      var d = arrow(point);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d);
      var id = path ? $(path).attr('class').split("e")[1] : $(target).attr('class').split("e")[1];
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = id;
        self.clicked.arrowOthers = false;
        if (self.clicked.space != 0) {
          self.clicked.removeMainPath();
        }
        self.draw();
        $(this).parent().find('.arrow').each(function() {
          $(this).attr("stroke", "black");
        });
        $(this).find('.arrow').attr("stroke", "red");
        if (self.clicked.connectCount() == 2) {
          $(this).parent().find('.ratio-ctrl').attr("visibility", 'hidden');
          $('#SecondColorPicker').hide();
        }
      });
      if ((!self.clicked.arrowOthers && self.clicked.arrow == id) || (self.clicked.arrowOthers && self.clicked.arrow != id)) line.select(".arrow").attr("stroke", "red");
    } else if (i == 3) {
      var point = {
        x: (c.x + s * v.ux()),
        y: (c.y + s * v.uy())
      };
      var d = arrow(point, true);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d);
      var id = path ? $(path).attr('class').split("e")[1] : $(target).attr('class').split("e")[1];
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = id;
        self.clicked.arrowOthers = true;
        if (self.clicked.space != 0) {
          self.clicked.removeMainPath();
        }
        self.draw();
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
      var d1 = arrow(point);
      var d2 = arrow(point, true);
      line.select(".arrow").attr('d', line.select(".arrow").attr('d') + d1 + d2);
      line.on('mouseup', function() {
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.arrow = self.clicked.id;
        self.clicked.arrowOthers = false;
        if (self.clicked.space != 0) {
          self.clicked.addMainPath();
        }
        self.draw();
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
      self.clicked.dasharray = $(this).find('.arrow').attr("stroke-dasharray");
      self.draw();
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
        self.draw();
      }
    });
    $("#ratio").val($("#slider-ratio").slider("value"));
  }
  var linkDiv = $('<div id="FirstColorPicker" style="text-align:center;margin-top:2px;">');
  var rColor = $('<span class="visualist_linkSelector_color">');
  for (var i in Interface.colors) {
    var color = Interface.colors[i];
    var link = $('<a href="#" title="' + color + '" style="background-color:' + color + '">&nbsp;&nbsp;&nbsp;</a>')
      .click(function(e) {
        e.preventDefault();
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.color = this.title;
        self.draw();
        $('#FirstColorPicker a').css('border-color', '#ffffff');
        $(this).css('border-color', '#444444');
      });
    rColor.append(link);
  }
  linkDiv.append(rColor);
  div.append(linkDiv);
  var linkDiv = $('<div id="SecondColorPicker" style="text-align:center;">');
  var rColor = $('<span class="visualist_linkSelector_color">');
  for (var i in Interface.colors) {
    var color = Interface.colors[i];
    var link = $('<a href="#" title="' + color + '" style="background-color:' + color + '">&nbsp;&nbsp;&nbsp;</a>')
      .click(function(e) {
        e.preventDefault();
        if (Interface.modifiedEntity == null) Interface.modifiedEntity = self.clicked.getData();
        self.clicked.secondColor = this.title;
        self.draw();
        $('#SecondColorPicker a').css('border-color', '#ffffff');
        $(this).css('border-color', '#444444');
      });
    rColor.append(link);
  }
  linkDiv.append(rColor);
  if (!(this.clicked.connectCount() == 2 && this.clicked.arrow == this.clicked.id)) {
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
