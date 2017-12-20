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
  this.selection = null;
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
    self.selection = self.getObjectAt(pos);
    if (self.selection) {
      if (Interface.addingLink) {
        Interface.addingLink.from = self.selection;
      } else {
        self.dragging = true;
        self.dragoffx = pos.x - self.selection.x;
        self.dragoffy = pos.y - self.selection.y;
      }
    }
  }, true);
  this.canvas.addEventListener('mousemove', function(e) {
    if (self.verbose) log('Move');
    var pos = self.getMouse(e);
    if (self.dragging) {
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      self.selection.x = pos.x - self.dragoffx;
      self.selection.y = pos.y - self.dragoffy;
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
    }
  }, true);
  this.canvas.addEventListener('mouseup', function(e) {
    if (self.verbose) log('Up');
    var target = self.getMouse(e);
    if (target && Interface.addingLink) {
      Interface.createRelation(e, [Interface.addingLink.from, target]);
    }
    Interface.addingLink = false;
    self.draw();
    self.dragging = false;
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
  var ctx = this.ctx;
  ctx.save();
  this.clear();
  if (d3.event) {
    this.translate = d3.event.translate;
    this.scale = d3.event.scale;
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
  if (this.selection != null) {
    this.selection.selector.update();

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

  mx = (e.pageX - this.translate[0] - offsetX) / this.scale ;
  my = (e.pageY - this.translate[1]  - offsetY) / this.scale ;

  // We return a simple javascript object (a hash) with x and y defined
  return {
    x: mx,
    y: my
  };
};
