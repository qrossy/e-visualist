Link.prototype.toString = function() {
  var ret = "Link";
  return ret;
};

function Link(params) {
  this.type = 1;
  this.width = params.width ? params.width : 1;
  this.space = params.space ? params.space : 0;
  this.arrow = params.arrow ? params.arrow : null;
  this.arrowOthers = params.arrowOthers ? params.arrowOthers : false;
  this.dasharray = params.dasharray ? params.dasharray : null;
  this.ratio = params.ratio ? params.ratio : 0.5;
  this.source = params.source ? params.source : null;
  this.target = params.target ? params.target : null;
  this.secondColor = params.secondColor ? params.secondColor : '#000000';
  this.distToNode = params.distToNode ? params.distToNode : 10;
  this.distToLink = params.distToLink ? params.distToLink : 15;
  this.mainPath = params.mainPath ? params.mainPath : null;
  this.parent = Entity;
  this.parent(params);

  if (this.startDateTime) {
    this.ctrlDateTime = 2;
  }

  this.getData = function() {
    var data = this.getMainData(); // inheritance from entity.js
    data.width = this.width; // Link's width (Number)
    data.space = this.space; // orthogonal position (if nb links between connected > 1)
    data.arrow = this.arrow; // null if none or id of entity (if this.id: bidirectional)
    data.arrowOthers = this.arrowOthers; // Arrow on all Entity except the one in this.arrow
    data.dasharray = this.dasharray; // Pattern of the line : null, solid, "10, 5", etc..
    data.ratio = this.ratio; // Ratio to moveCenter Point of bidirecional link, from 0 to 1 (0.5 = center)
    data.secondColor = this.secondColor; // Target to Center color (for bidirectional link)
    data.distToLink = this.distToLink; // distance between links (if more than one link between same Nodes)
    data.distToNode = this.distToNode; // distance between first ctrlPoint and Node
    data.mainPath = this.getRootMainPath(); // pathData to store Corners
    data.source = this.source ? this.source.id : null;
    data.target = this.target ? this.target.id : null;
    return data;
  };
}

Link.prototype.create = function() {
  if (this.svg) {
    this.svg.remove();
  }
  if (this.g.isSVG) {
    this.svg = this.g.svg.select(".links").append("svg:g");
    this.eventHandler = new linkEvent(this.g, this);
  } else if (this.g.isCanvas) {
    //we create detached element used to compute calculation with SVGPath
    //but we don't draw it !
    this.svg = d3.select("body").append("svg").remove();
  }

  this.svg
    .attr("class", "link")
    .attr("id", this.id);

  if (this.connectCount() == 2) {
    var clink = this.g.relations[this.hash()][0];
    if (clink.source != this.source) {
      this.source = clink.source;
      this.target = clink.target;
    }
    if (this.space == 0) {
      this.addMainPath();
    }
    this.setMainPath(this.mainPath);
  }

  for (var i in this.connect) {
    var p = this.svg.append("svg:path")
      .attr("class", "e" + i)
      .attr("fill-opacity", 0)
      .attr("pointer-events", "none")
      .attr("stroke-linejoin", "round");
    //.attr("stroke-linecap", "round"); //	butt | round | square | inherit
    this.svg.append("svg:path")
      .attr("class", "click_e" + i) //last letter needs to be "e", split("e") in linkEvent
      .attr("stroke-width", 5)
      .attr("fill-opacity", 0)
      .attr("pointer-events", "stroke")
      .attr("visibility", "hidden");
  }
  this.createLabels();
};

Link.prototype.drawTheme = function() {
  // this.svg.selectAll(".arrow").remove();
  // var p = 0;
  // var totY = 0;
  // for (id in this.connect){
  // totY += this.connect[id].getCenter().y;
  // }
  // this.y = totY/this.connectCount();

  // for (var i in this.connect){
  // p += 1;
  // var id  = ".e"+i;
  // this.svg.select(id)
  // .attr("stroke-width", this.width)
  // .attr("stroke-dasharray", this.dasharray)
  // .attr("stroke", this.color);

  // var y = this.connect[i].y + this.connect[i].h/2.0;
  // var d = "M"+pos.x+","+pos.y+" L"+pos.x+","+pos.y+
  // " L"+this.x+","+this.y+" L"+this.x+","+this.y;
  // this.svg.select(id)
  // .attr("d", d);
  // }
};

Link.prototype.drawSLink = function() {
  var path = this.svg.select('.e' + this.source.id);
  var start;
  var end;
  path.attr("stroke-width", this.width)
    .attr("stroke-dasharray", this.dasharray)
    .attr("stroke", this.color);

  this.svg.select('.e' + this.target.id).attr("visibility", "hidden");
  if (this.space == 0) {
    var segments = this.getMainPath().node().getPathData();
    if (this.getMainPath().attr("d") && segments.length > 4) {
      start = Link.getIntersection(this.source, segments.getItem(2));
      if (start.x && start.y) {
        Link.applyCoord(start, segments.getItem(0));
        Link.applyCoord(start, segments.getItem(1));
      }
      end = Link.getIntersection(this.target, segments.getItem(segments.length - 3));
      if (end.x && end.y) {
        Link.applyCoord(end, segments.getItem(segments.length - 1));
        Link.applyCoord(end, segments.getItem(segments.length - 2));
      }
      this.setMainPath(segments.path());
    } else {
      start = Link.getIntersection(this.source, this.target.getCenter());
      end = Link.getIntersection(this.target, this.source.getCenter());
      if (start.x && start.y && end.x && end.y) {
        this.setMainPath("M" + start.x + "," + start.y + " L" + start.x + "," + start.y +
          " L" + end.x + "," + end.y + " L" + end.x + "," + end.y);
      } else {
        return;
      }
    }
    path.attr("d", this.getMainPath().attr("d"));
  } else {
    path.attr("d", this.getRootMainPath().attr('d'));
  }
  this.updateSpacers(path.node(), '.e' + this.source.id);
  this.setMainPath(path.attr('d'));
  this.svg.select(".click_e" + this.source.id).attr("d", path.attr("d"));
  if (this.g.isCanvas && this.arrow != this.id) {
    var ctx = this.g.context;
    ctx.strokeStyle = this.color;
    if (this.dasharray) ctx.setLineDash(this.dasharray);
    ctx.lineWidth = this.width;
    this.canvasPath2D = new Path2D(this.mainPath);
    ctx.stroke(this.canvasPath2D);
    ctx.setLineDash([0]);
  }
};

Link.prototype.drawBLink = function() {
  var d;
  this.drawSLink();
  var sPath = this.svg.select('.e' + this.source.id);
  var l = sPath.node().getTotalLength() * this.ratio;
  var center = sPath.node().getPointAtLength(l);
  Link.applyCoord(center, this);
  var sSeg = sPath.node().getPathData();
  var i = sSeg.getSegIndexAtLength(l);
  for (var s = sSeg.length - 1; s >= i; s--) {
    var p = sSeg.getItem(s);
    if (!d) {
      d = 'M' + p.x + ',' + p.y + ' ';
    } else {
      d += 'L' + p.x + ',' + p.y + ' ';
    }
    sSeg.removeItem(s);
  }
  sPath.attr('d', sSeg.path() + ' L' + center.x + ' ' + center.y);
  this.svg.select('.e' + this.target.id)
    .attr('d', d + ' L' + center.x + ' ' + center.y)
    .attr("stroke-width", this.width)
    .attr("stroke-dasharray", this.dasharray)
    .attr("stroke", this.secondColor)
    .attr("visibility", "visible");
  if (this.g.isCanvas) {
    var ctx = this.g.context;
    ctx.strokeStyle = this.color;
    if (this.dasharray) ctx.setLineDash(this.dasharray);
    ctx.lineWidth = this.width;
    this.canvasPath2D = new Path2D(sSeg.path() + ' L' + center.x + ' ' + center.y);
    ctx.stroke(this.canvasPath2D);
    ctx.setLineDash([0]);
    ctx.strokeStyle = this.secondColor;
    if (this.dasharray) ctx.setLineDash(this.dasharray);
    ctx.lineWidth = this.width;
    this.canvasPath2D = new Path2D(d + ' L' + center.x + ' ' + center.y);
    ctx.stroke(this.canvasPath2D);
    ctx.setLineDash([0]);
  }
};

Link.prototype.drawMLink = function() {
  for (var i in this.connect) {
    var id = ".e" + i;
    this.svg.select(id)
      .attr("stroke-width", this.width)
      .attr("stroke-dasharray", this.dasharray)
      .attr("stroke", this.color);

    var path = this.svg.select(id).node();
    this.setLinkCenter();
    if (this.space == 0) {
      var segments = path.getPathData();
      if (this.svg.select(id).attr('d')) {
        if (this.x && this.y) {
          Link.applyCoord(this, segments.getItem(segments.length - 1));
          Link.applyCoord(this, segments.getItem(segments.length - 2));
        }
        var next = segments.getItem(2);
        var start = Link.getIntersection(this.connect[i], next);
        if (start.x && start.y) {
          Link.applyCoord(start, segments.getItem(0));
          Link.applyCoord(start, segments.getItem(1));
        }
      } else {
        if (!this.x || !this.y) {
          this.setLinkCenter();
        }
        var pos = Link.getIntersection(this.connect[i], this);
        var d = "M" + pos.x + "," + pos.y + " L" + pos.x + "," + pos.y +
          " L" + this.x + "," + this.y + " L" + this.x + "," + this.y;
        this.svg.select(id)
          .attr("d", d);
      }
    } else {
      this.svg.select(id).attr("d", this.g.relations[this.hash()][0].svg.select(id).attr('d'));
    }
    this.updateSpacers(path, id);
    this.svg.select(".click_e" + i).attr("d", this.svg.select(id).attr("d"));
  }
};

Link.prototype.redraw = function() {
  //Draw Link
  if (this.isThemeLink()) {
    this.drawTheme();
  } else if (this.connectCount() == 2) {
    if (this.arrow == this.id) {
      this.drawBLink();
    } else {
      this.drawSLink();
    }
  } else {
    this.drawMLink();
  }

  //Draw Labels
  this.redrawLabels();

  //Draw Arrows
  this.svg.selectAll(".arrow").remove();
  if (this.arrow != null) {
    this.drawArrows();
  }
};

Link.prototype.updateSpacers = function(path, id) {
  var space = parseInt((this.space + 1) / 2);
  space = this.space % 2 == 0 ? space * this.distToLink : (-space * this.distToLink);
  var segments = path.getPathData();
  var init = segments.getItem(0);
  var end = segments.getItem(segments.length - 1);
  if (init.x == end.x && init.y == end.y) {
    return;
  }

  var c1 = segments.getItem(1);
  var c2 = segments.getItem(segments.length - 2);
  var next = segments.getItem(2);
  var last = segments.getItem(segments.length - 3);
  var v1 = Link.vector(init, next);
  var v2 = Link.vector(end, last);

  c2.x = end.x + this.distToNode * v2.ux() + (space * v2.uy());
  c2.y = end.y + this.distToNode * v2.uy() + (-space * v2.ux());
  c1.x = init.x + this.distToNode * v1.ux() + (-space * v1.uy());
  c1.y = init.y + this.distToNode * v1.uy() + (space * v1.ux());
  path.setAttribute("d", segments.path());

  if (this.space != 0) {
    var rootSegments = this.connectCount() == 2 ?
      this.getRootMainPath().node().getPathData() :
      this.g.relations[this.hash()][0].svg.select(id).node().getPathData();
    if (rootSegments.length > 4) {
      var eq;
      for (var i = 2; i < rootSegments.length - 2; i++) {
        var p = rootSegments.getItem(i);
        v1 = Link.vector(rootSegments.getItem(i - 1), p);
        v2 = Link.vector(rootSegments.getItem(i + 1), p);
        var m = Link.vector([0, 0], [0, 0]);
        m.x = (v1.ux() + v2.ux());
        m.y = (v1.uy() + v2.uy());
        var cp = segments.getItem(i);
        var inter = Link.lineIntersect(Link.lineEq(v1, segments.getItem(i - 1)), Link.lineEq(m, rootSegments.getItem(i)));
        if (inter.x && inter.y) {
          var v = Link.vector(p, inter);
          if (v.norm() > 3 * Math.abs(space)) {
            cp.x = p.x + 3 * Math.abs(space) * v.ux();
            cp.y = p.y + 3 * Math.abs(space) * v.uy();
          } else {
            cp.x = inter.x;
            cp.y = inter.y;
          }
        } else if (v1.x == 0) {
          cp.x = segments.getItem(i - 1).x;
          eq = Link.lineEq(m, rootSegments.getItem(i));
          cp.y = eq.a * cp.x + eq.b;
        } else if (v2.x == 0) {
          cp.x = segments.getItem(i + 1).x;
          eq = Link.lineEq(m, rootSegments.getItem(i));
          cp.y = eq.a * cp.x + eq.b;
        } else if (v1.y == 0) {
          cp.y = segments.getItem(i - 1).y;
          cp.x = p.x;
        } else if (v2.y == 0) {
          cp.y = segments.getItem(i + 1).y;
          cp.x = p.x;
        }
      }
      path.setAttribute("d", segments.path());
    }
  }
};

Link.prototype.setLinkCenter = function() {
  var pos = [0, 0];
  for (var id in this.connect) {
    var c = this.connect[id].getCenter();
    if (this.svg.select(".e" + id).attr('d')) {
      var centralLink = this.g.relations[this.hash()][0];
      var path = centralLink.svg.select(".e" + id).node();
      var segments = path.getPathData();
      if (segments.length > 4) {
        c = segments.getItem(segments.length - 3);
      }
    }
    pos[0] += c.x;
    pos[1] += c.y;
  }
  this.x = pos[0] / this.connectCount();
  this.y = pos[1] / this.connectCount();
};

Link.prototype.isThemeLink = function() {
  var themeLink = true;
  for (var i in this.connect) {
    if (!this.connect[i].theme.draw) {
      themeLink = false;
      break;
    }
  }
  return themeLink;
};

Link.prototype.drawArrows = function() {
  for (var i in this.connect) {
    if ((this.arrow == i && !this.arrowOthers) || (this.arrow != i && this.arrowOthers) || this.arrow == this.id) {
      this.addArrow(i);
    }
  }
};

Link.prototype.addArrow = function(entityId) {
  //TODO: ADD arrow params in GENERAL SETTINGS
  var dist = 10; // ArrowLength
  var space = 3 + this.width / 2; // ArrowSpace
  var path;
  if (this.connectCount() == 2 && this.arrow != this.id) {
    path = this.svg.select(".e" + this.source.id).node();
  } else {
    path = this.svg.select(".e" + entityId).node();
  }

  var segments = path.getPathData();
  var point;
  var v;
  if (this.connectCount() == 2 && this.arrow == this.id) {
    point = segments.getItem(segments.length - 1);
    v = Link.vector(segments.getItem(segments.length - 1), segments.getItem(segments.length - 2));
  } else if (this.arrow == this.id || (this.connectCount() == 2 && this.arrowOthers == true)) {
    point = segments.getItem(segments.length - 2);
    v = Link.vector(segments.getItem(segments.length - 2), segments.getItem(segments.length - 3));
  } else {
    point = segments.getItem(1);
    v = Link.vector(segments.getItem(1), segments.getItem(2));
  }

  var d = " M" + (point.x + dist * v.ux() + (space * v.uy())) + "," + (point.y + dist * v.uy() - (space * v.ux()));
  d += " L" + (point.x + (this.width / 4 * v.uy())) + "," + (point.y + (-this.width / 4 * v.ux()));
  d += " L" + (point.x - (this.width / 4 * v.uy())) + "," + (point.y + (this.width / 4 * v.ux()));
  d += " L" + (point.x + dist * v.ux() - (space * v.uy())) + "," + (point.y + dist * v.uy() + (space * v.ux()));
  this.svg.append("svg:path")
    .attr("class", "arrow")
    .attr("fill-opacity", 0)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", this.width > 4 ? this.width / 2 : this.width)
    .attr("stroke", (this.connectCount() == 2 && this.arrow == this.id && entityId == this.target.id) ? this.secondColor : this.color)
    .attr("d", d);
  if (this.g.isCanvas) {
    var color = this.color;
    if (this.connectCount() == 2 && this.arrow == this.id && entityId == this.target.id) {
      color = this.secondColor;
    }
    var ctx = this.g.context;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.width > 4 ? this.width / 2 : this.width;
    this.canvasPath2D = new Path2D(d);
    ctx.stroke(this.canvasPath2D);
  }
};


Link.prototype.addMainPath = function() {
  if (!this.svg.select(".mainPath").node()) {
    this.svg.append("svg:path")
      .attr("class", "mainPath")
      .attr("pointer-events", "none")
      .attr("visibility", "hidden");
  }
};

Link.prototype.removeMainPath = function() {
  this.svg.select(".mainPath").remove();
};

Link.prototype.setMainPath = function(d) {
  this.mainPath = d;
  this.svg.select(".mainPath").attr("d", d);
};

Link.prototype.getMainPath = function() {
  return this.svg.select(".mainPath");
};

Link.prototype.getRootMainPath = function() {
  var clink = this.g.relations[this.hash()][0];
  return clink.svg.select(".mainPath");
};

Link.getPathIndex = function(segments, point) {
  var dist = [];
  var get = {};
  for (var i = 0; i < segments.length - 1; i++) {
    var l = Link.getDistanceToSegment(segments.getItem(i), segments.getItem(i + 1), point);
    if (l || l == 0) {
      dist.push(l);
      get[l] = i;
    }
  }
  return get[Math.min.apply(Math, dist)] + 1;
};

Link.getDistanceToSegment = function(pi, pj, pc) {
  var Vij = Link.vector(pi, pj);
  var Vic = Link.vector(pi, pc);
  var n = (Vij.x * Vic.x + Vij.y * Vic.y) / Vij.norm();
  if (n < -1 || n > Vij.norm()) {
    return null;
  } else {
    return Math.sqrt(Vic.norm() * Vic.norm() - n * n);
  }
};

Link.getIntersection = function(entity, point) {
  var bbox = entity.bBox('link');
  // Bug if x or y = 0 !
  if (bbox.y == 0) {
    bbox.y = 1;
  }
  if (bbox.x == 0) {
    bbox.x = 1;
  }
  var line = [entity.getCenter(), point];
  var nodeIntersect = Link.boxIntersect(bbox, line);
  var nodeVect = Link.vector(point, nodeIntersect);
  for (var i in entity.labels) {
    var b = entity.labels[i].bBox();
    var labelIntersect = Link.boxIntersect(b, line);
    if (labelIntersect) {
      var labelVect = Link.vector(point, labelIntersect);
      if (labelVect.norm() < nodeVect.norm()) {
        nodeIntersect = labelIntersect;
        nodeVect = labelVect;
      }
    }
  }

  if (!nodeIntersect.x || !nodeIntersect.y) {
    nodeIntersect = entity.getCenter();
  }

  return nodeIntersect;
};

Link.boxIntersect = function(bbox, line) {
  var n = [{
    x: bbox.x,
    y: bbox.y
  }, {
    x: bbox.x + bbox.width,
    y: bbox.y
  }];
  var s = [{
    x: bbox.x,
    y: bbox.y + bbox.height
  }, {
    x: bbox.x + bbox.width,
    y: bbox.y + bbox.height
  }];
  var e = [{
    x: bbox.x,
    y: bbox.y
  }, {
    x: bbox.x,
    y: bbox.y + bbox.height
  }];
  var w = [{
    x: bbox.x + bbox.width,
    y: bbox.y
  }, {
    x: bbox.x + bbox.width,
    y: bbox.y + bbox.height
  }];
  var lines = [n, s, e, w];
  var inter = [];
  for (var i in lines) {
    var p1 = {};
    var p2 = {};
    var r = Link.intersect(lines[i], line, p1, p2);
    if (r != 0) {
      inter.push(p1);
    }
  }
  if (inter.length == 0) {
    return false;
  } else if (inter.length == 1) {
    return inter[0];
  } else {
    var v1 = Link.vector(inter[0], line[1]);
    var v2 = Link.vector(inter[1], line[1]);
    return v1.norm() < v2.norm() ? inter[0] : inter[1];
  }
};

//FROM: http://softsurfer.com/Archive/algorithm_0104/algorithm_0104B.htm#intersect2D_SegSeg%28%29

// intersect2D_2Segments(): the intersection of 2 finite 2D segments
//    Input:  two finite segments S1 and S2
//    Output: *I0 = intersect point (when it exists)
//            *I1 = endpoint of intersect segment [I0,I1] (when it exists)
//    Return: 0=disjoint (no intersect)
//            1=intersect in unique point I0
//            2=overlap in segment from I0 to I1
Link.intersect = function(S1, S2, I0, I1) {
  var SMALL_NUM = 0.00000001; // anything that avoids division overflow

  var u = Link.vector(S1[0], S1[1]);
  var v = Link.vector(S2[0], S2[1]);
  var w = Link.vector(S2[0], S1[0]);
  var D = Link.perp(u, v);
  // test if they are parallel (includes either being a point)
  if (Math.abs(D) < SMALL_NUM) { // S1 and S2 are parallel
    if (Link.perp(u, w) != 0 || Link.perp(v, w) != 0) {
      return 0; // they are NOT collinear
    }
    // they are collinear or degenerate
    // check if they are degenerate points
    var du = Link.dot(u, u);
    var dv = Link.dot(v, v);
    if (du == 0 && dv == 0) { // both segments are points
      if (S1[0] != S2[0]) // they are distinct points
        return 0;
      I0 = S1[0]; // they are the same point
      return 1;
    }
    if (du == 0) { // S1 is a single point
      if (Link.inSegment(S1[0], S2) == 0) // but is not in S2
        return 0;
      I0 = S1[0];
      return 1;
    }
    if (dv == 0) { // S2 a single point
      if (Link.inSegment(S2[0], S1) == 0) // but is not in S1
        return 0;
      I0 = S2[0];
      return 1;
    }
    // they are collinear segments - get overlap (or not)
    var t0;
    var t1; // endpoints of S1 in eqn for S2
    var w2 = Link.vector(S2[0], S1[1]);
    if (v.x != 0) {
      t0 = w.x / v.x;
      t1 = w2.x / v.x;
    } else {
      t0 = w.y / v.y;
      t1 = w2.y / v.y;
    }

    if (t0 > t1) { // must have t0 smaller than t1
      var t = t0;
      t0 = t1;
      t1 = t; // swap if not
    }
    if (t0 > 1 || t1 < 0) {
      return 0; // NO overlap
    }
    t0 = t0 < 0 ? 0 : t0; // clip to min 0
    t1 = t1 > 1 ? 1 : t1; // clip to max 1
    if (t0 == t1) { // intersect is a point
      I0.x = S2[0].x + t0 * v.x;
      I0.y = S2[0].y + t0 * v.y;
      return 1;
    }

    // they overlap in a valid subsegment
    I0.x = S2[0].x + t0 * v.x;
    I0.y = S2[0].y + t0 * v.y;
    I1.x = S2[0].x + t1 * v.x;
    I1.y = S2[0].y + t1 * v.y;
    return 2;
  }

  // the segments are skew and may intersect in a point
  // get the intersect parameter for S1
  var sI = Link.perp(v, w) / D;
  if (sI < 0 || sI > 1) // no intersect with S1
    return 0;

  // get the intersect parameter for S2
  var tI = Link.perp(u, w) / D;
  if (tI < 0 || tI > 1) // no intersect with S2
    return 0;

  I0.x = S1[0].x + sI * u.x;
  I0.y = S1[0].y + sI * u.y; // compute S1 intersect point
  return 1;
};

Link.dot = function(u, v) {
  return u.x * v.x + u.y * v.y;
};

Link.perp = function(u, v) {
  return u.x * v.y - u.y * v.x;
};

// inSegment(): determine if a point is inside a segment
//    Input:  a point P, and a collinear segment S
//    Return: 1 = P is inside S
//            0 = P is not inside S
Link.inSegment = function(P, S) {
  if (S[0].x != S[1].x) { // S is not vertical
    if (S[0].x <= P.x && P.x <= S[1].x)
      return 1;
    if (S[0].x >= P.x && P.x >= S[1].x)
      return 1;
  } else { // S is vertical, so test y coordinate
    if (S[0].y <= P.y && P.y <= S[1].y)
      return 1;
    if (S[0].y >= P.y && P.y >= S[1].y)
      return 1;
  }
  return 0;
};

/*
 * Vector
 *
 * Accept point.x/point.y or point[0]/point[1]
 *
 */
Link.vector = function(from, to) {
  var v = {};
  v.x = ((to.x || to.x == 0) ? parseFloat(to.x) : parseFloat(to[0])) - ((from.x || from.x == 0) ? parseFloat(from.x) : parseFloat(from[0]));
  v.y = ((to.y || to.y == 0) ? parseFloat(to.y) : parseFloat(to[1])) - ((from.y || from.y == 0) ? parseFloat(from.y) : parseFloat(from[1]));
  v.norm = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  v.ux = function() {
    return this.norm() != 0 ? this.x / this.norm() : 0;
  };
  v.uy = function() {
    return this.norm() != 0 ? this.y / this.norm() : 0;
  };
  return v;
};

/**
 * Line Equation
 *
 * @Param {vector:Link.vector, point:{x:float,y:float}}
 * @Return {{a:float, b:float}} y = ax + b
 */
Link.lineEq = function(vector, point) {
  var p = [point.x + vector.x, point.y + vector.y];
  var a = vector.y / vector.x;
  var b = p[1] - a * p[0];
  return {
    a: a,
    b: b
  };
};

/**
 * Line Intersection
 *
 * @Param {lineA:Link.lineEq, lineB:Link.lineEq}
 * @Return {{x:float, y:float}} Intersection
 */
Link.lineIntersect = function(lineA, lineB) {
  var x = (lineA.b - lineB.b) / (lineB.a - lineA.a);
  var y = lineA.a * x + lineA.b;
  return {
    x: x,
    y: y
  };
};

Link.applyCoord = function(from, to) {
  to.x = from.x;
  to.y = from.y;
};
