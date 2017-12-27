Polygon.prototype.toString = function() {
  var ret = "Polygon";
  return ret;
};

function Polygon(params) {
  this.type = 3;
  this.width = params.width ? params.width : 1;
  this.opacity = params.opacity ? params.opacity : 0.1;
  this.bufferWidth = params.bufferWidth ? params.bufferWidth : 5;
  this.dasharray = params.dasharray ? params.dasharray : [0];
  this.parent = Entity;
  this.parent(params);

  // ------------------------------
  // Public functions
  // ------------------------------

  this.getData = function() {
    var data = this.getMainData();
    data.width = this.width; // width (Number)
    data.opacity = this.opacity;
    data.bufferWidth = this.bufferWidth;
    data.dasharray = this.dasharray; // Pattern of the line : null, solid, "10, 5", etc..

    return data;
  };

  this.redraw = function() {
    var points = [];
    for (var i in this.connect) {
      var bb = this.connect[i].bBox('all');
      points.push([bb.x, bb.y]);
      points.push([bb.x, bb.y + bb.height]);
      points.push([bb.x + bb.width, bb.y]);
      points.push([bb.x + bb.width, bb.y + bb.height]);
    }

    points = Polygon.getConvexHull(points);
    Polygon.extendConvexHull(points, this.bufferWidth);
    var centers = Polygon.bezierPoints(points);
    var svgpoints = "M ";
    for (var p = 0; p < points.length; p++) {
      if (p != 0) {
        svgpoints += "L ";
      }
      svgpoints += parseInt(centers[p][0][0]) + " " + parseInt(centers[p][0][1]) + " ";
      svgpoints += "Q " + parseInt(points[p][0]) + " " + parseInt(points[p][1]) + " ";
      svgpoints += parseInt(centers[p][1][0]) + " " + parseInt(centers[p][1][1]) + " ";
    }
    svgpoints += "T " + parseInt(centers[0][0][0]) + " " + parseInt(centers[0][0][1]) + " ";
    this.path = svgpoints;
    if (this.g.isCanvas) {
      var ctx = this.g.context;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = this.Color;
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      ctx.setLineDash(this.dasharray);
      this.canvasPath2D = new Path2D(svgpoints);
      ctx.fill(this.canvasPath2D);
      ctx.restore();
    } else if (this.g.isSVG) {
      this.svg.select('path')
        .attr("fill", this.color)
        .attr("stroke", this.color)
        .attr("stroke-dasharray", this.dasharray)
        .attr("fill-opacity", this.opacity)
        .attr("stroke-width", this.width);
      this.svg.select("path")
        .attr("d", svgpoints);
    }
  };

  this.create = function() {
    if (this.g.isCanvas) {} else if (this.g.isSVG) {
      this.svg = this.g.svg.select(".boxes").append("svg:g");
      this.eventHandler = new boxEvent(this.g, this);
      this.svg
        .attr("class", "polygon");
      this.svg.append("svg:path")
        .attr("fill", this.color)
        .attr("fill-opacity", this.opacity)
        .attr("stroke-width", this.width)
        .attr("stroke", this.color);
    }
  };
}

Polygon.prototype.bBox = function() {
  var box = {};
  for (var c in this.connect) {
    var entity = this.connect[c];
    var e = entity.bBox();
    if (!box.x) {
      box.x = e.x;
      box.y = e.y;
      box.mx = e.x + e.width;
      box.my = e.y + e.height;
    } else {
      if (box.x > e.x) {
        box.x = e.x;
      } else {
        box.mx = e.x + e.width;
      }
      if (box.y > e.y) {
        box.y = e.y;
      } else {
        box.my = e.y + e.height;
      }
    }
  }
  box.width = box.mx - box.x;
  box.height = box.my - box.y;
  return box;
};

Polygon.getConvexHull = function(points) {
  // var allBaseLines = [];
  //find first baseline
  var maxX, minX;
  var maxPt, minPt;
  for (var idx in points) {
    var pt = points[idx];
    if (pt[0] > maxX || !maxX) {
      maxPt = pt;
      maxX = pt[0];
    }
    if (pt[0] < minX || !minX) {
      minPt = pt;
      minX = pt[0];
    }
  }
  var ch = [].concat(Polygon.buildConvexHull([minPt, maxPt], points),
    Polygon.buildConvexHull([maxPt, minPt], points));
  return ch;
};

Polygon.buildConvexHull = function(baseLine, points) {
  //allBaseLines.push(baseLine);
  var convexHullBaseLines = [];
  var t = Polygon.findMostDistantPointFromBaseLine(baseLine, points);
  if (t.maxPoint.length) {
    convexHullBaseLines = convexHullBaseLines.concat(Polygon.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints));
    convexHullBaseLines = convexHullBaseLines.concat(Polygon.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints));
    return convexHullBaseLines;
  } else {
    return [baseLine[0]];
  }
};

Polygon.getDistant = function(cpt, bl) {
  Vy = bl[1][0] - bl[0][0];
  Vx = bl[0][1] - bl[1][1];
  return (Vx * (cpt[0] - bl[0][0]) + Vy * (cpt[1] - bl[0][1]));
};

Polygon.findMostDistantPointFromBaseLine = function(baseLine, points) {
  var maxD = 0;
  var maxPt = [];
  var newPoints = [];
  for (var idx in points) {
    var pt = points[idx];
    var d = Polygon.getDistant(pt, baseLine);

    if (d > 0) {
      newPoints.push(pt);
    } else {
      continue;
    }

    if (d > maxD) {
      maxD = d;
      maxPt = pt;
    }

  }
  return {
    'maxPoint': maxPt,
    'newPoints': newPoints
  };
};

Polygon.extendConvexHull = function(points, bufferWidth) {
  var x = 0;
  var y = 0;
  for (var i in points) {
    x += points[i][0];
    y += points[i][1];
  }
  x /= points.length;
  y /= points.length;

  for (var i in points) {
    var dx = (points[i][0] - x);
    var dy = (points[i][1] - y);
    var norm = Math.sqrt(dx * dx + dy * dy);
    points[i][0] = (dx / norm) * bufferWidth + points[i][0]
    points[i][1] = (dy / norm) * bufferWidth + points[i][1]
  }
};

Polygon.bezierPoints = function(points) {
  var bpoints = []
  for (var i in points) {
    var p = parseInt(i) - 1;
    var n = parseInt(i) + 1;
    if (i == 0) {
      p = points.length - 1;
    } else if (i == points.length - 1) {
      n = 0;
    }
    var dx1 = (points[i][0] - points[p][0]);
    var dy1 = (points[i][1] - points[p][1]);
    var dx2 = (points[n][0] - points[i][0]);
    var dy2 = (points[n][1] - points[i][1]);
    var norm1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    var norm2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    var m = 15;
    bpoints.push([
      [points[i][0] - (dx1 / norm1) * m,
        points[i][1] - (dy1 / norm1) * m
      ],
      [points[i][0] + (dx2 / norm2) * m,
        points[i][1] + (dy2 / norm2) * m
      ],
    ]);
  }
  return bpoints;
};
