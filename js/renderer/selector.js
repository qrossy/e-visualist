function Selector(graph, elem) {
  this.g = graph;
  this.elem = elem;
  this.parent = this.g.isSVG ? this.g.svg.select(".selectors") : this.g.canvas;
  this.cSize = 3;
  if (this.g.isCanvas) {
    var context = this.g.context;
  } else if (this.g.isSVG) {
    this.svg = this.parent.append("svg:g")
      .attr("class", "selector")
      .attr("entity", this.elem.id)
      .attr("graph", this.g.id);

    this.eventHandler = new selectorEvent(this.g, this);
  }
}

Selector.prototype.gripPos = function(id) {
  var grip = this.svg.select('.' + id);
  return [parseInt(grip.attr('cx')), parseInt(grip.attr('cy'))];
};

Selector.prototype.updateGrip = function(point, id) {
  if (this.g.isCanvas) {
    var context = this.g.context;
		context.beginPath();
		context.fillStyle = "rgba(100, 100, 100, 0.5)";
		context.arc(point.x, point.y, this.cSize, 0, 2 * Math.PI);
		context.fill();
  } else if (this.g.isSVG) {
    var grip = this.svg.append("svg:circle")
      .attr("class", id ? id : 'grip')
      .attr("fill-opacity", 0.5)
      .attr("stroke-width", 1)
      .attr("stroke", '#ffffff')
      .attr("r", this.cSize)
      .attr("cx", point.x)
      .attr("cy", point.y);
  }
};

Selector.prototype.update = function() {
  if (this.g.isSVG) {
    this.clear();
  }
  var self = this;
  if (this.elem.type == 0 || this.elem.type == 2) {
    var bb = this.elem.bBox();
    for (var id in Selector.corners) {
      this.updateGrip(Selector.corners[id](bb.x, bb.y, bb.width, bb.height), id);
    }
  } else if (this.elem.type == 1) {
    if (this.elem.connectCount() != 2 || this.elem.arrow == this.elem.id) {
      this.updateGrip(this.elem.getPosition(), "center");
    }
    this.elem.svg.selectAll("path").each(function() {
      if ($(this).attr("visibility") == "hidden" || $(this).attr("class") == "arrow" || $(this).attr("class").split("_")[0] == "click") {
        return;
      }
      var s = this.getPathData();
      for (var i = 1; i <= (s.length - 2); i++) {
        var id = $(this).attr('class');
        self.updateGrip(s.getItem(i), id + "_cp_" + i);
      }
    });
  } else if (this.elem.type == 3) {
    if (this.g.isSVG) {
      this.elem.svg.select("path").each(function() {
        var s = this.getPathData();
        for (var i = 1; i <= (s.length - 2); i += 2) {
          var id = $(this).attr('class');
          self.updateGrip(s.getItem(i), id + "_cp_" + i);
        }
      });
    }
  }
  if (this.g.isSVG) {
    this.svg.attr('visibility', 'visible');
  }
};

Selector.prototype.clear = function() {
  this.svg.selectAll("circle").remove();
};

Selector.corners = {
  'nw': function(x, y, w, h) {
    return {
      x: x + w,
      y: y
    };
  },
  'n': function(x, y, w, h) {
    return {
      x: x + w / 2,
      y: y
    };
  },
  'ne': function(x, y, w, h) {
    return {
      x: x,
      y: y
    };
  },
  'e': function(x, y, w, h) {
    return {
      x: x,
      y: y + h / 2
    };
  },
  'se': function(x, y, w, h) {
    return {
      x: x,
      y: y + h
    };
  },
  's': function(x, y, w, h) {
    return {
      x: x + w / 2,
      y: y + h
    };
  },
  'sw': function(x, y, w, h) {
    return {
      x: x + w,
      y: y + h
    };
  },
  'w': function(x, y, w, h) {
    return {
      x: x + w,
      y: y + h / 2
    };
  },
};

Selector.fixPoint = {
  'nw': 'se',
  'n': 'se',
  'ne': 'sw',
  'e': 'nw',
  'se': 'nw',
  's': 'ne',
  'sw': 'ne',
  'w': 'ne',
};

Selector.oppositeX = {
  'nw': 'ne',
  'n': 'n',
  'ne': 'nw',
  'e': 'w',
  'se': 'sw',
  's': 's',
  'sw': 'se',
  'w': 'e',
};

Selector.oppositeY = {
  'nw': 'sw',
  'n': 's',
  'ne': 'se',
  'e': 'e',
  'se': 'ne',
  's': 'n',
  'sw': 'nw',
  'w': 'w',
};
