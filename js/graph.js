/**
 * Class variables
 * @param {number} graphId Store next available id
 */
Graph.nextId = 0;

/**
 * Graph
 * Contains only Entities, manage their types
 * @constructor
 * @param {number} id Given or autoint
 * @param {Object.<int, Entity>} all Store reference to all instances of Entity in the graph
 */
function Graph(params) {
  Graph.nextId++;
  if (!params) params = {};
  this.id = params.id ? params.id : this.id = Graph.nextId;

  this.all = {};
  this.nodes = {};
  this.relations = {};
  this.ctrl = new Controller(this.all);
  this.name = 'Graph' + this.id;
  this.snapToGrid = true;
  this.gridSize = 15;
  this.gridVisible = false;
  this.renderer = 'canvas'; //'svg' or 'canvas'
  this.isSVG = false;
  this.isCanvas = true;
  this.svg = null;
  this.canvas = null;
  this.context = null; //canvas context to draw
  this.images = {}; //store images for canvas renderers
  this.timeBarEventSource = new Timeline.DefaultEventSource();

}

Graph.prototype.setRenderer = function(type) {
  if (type == 'svg') {
    this.renderer = 'svg';
    this.isSVG = true;
    this.isCanvas = false;
  } else if (type == 'canvas') {
    this.renderer = 'canvas';
    this.isSVG = false;
    this.isCanvas = true;
  }
};

Graph.prototype.init = function() {
  var self = this;
  if (this.isCanvas) {
    this.canvas = d3.select("#graph_" + this.id)
      .append("canvas")
      .attr("class", "canvas")
      .attr("transform", "translate(0) scale(1)");
    this.context = this.canvas.node().getContext("2d");
    this.canvas.eventHandler = new CanvasEvent(this);

  } else if (this.isSVG) {
    this.svg = d3.select("#graph_" + this.id)
      .append("svg:svg")
      .attr("class", "svg-droppable");
    //Defs
    this.svg.append("svg:defs")
      .append("svg:pattern")
      .attr("id", "gridPattern")
      .attr("x", "0")
      .attr("y", "0")
      .attr("width", this.gridSize)
      .attr("height", this.gridSize)
      .attr("patternUnits", "userSpaceOnUse")
      .append("svg:rect")
      .attr("x", "0")
      .attr("y", "0")
      .attr("width", "100")
      .attr("height", "100")
      .attr("fill", "grey");
    //Grid
    this.svg.append("svg:rect")
      .attr("class", "grid")
      .attr("fill", "url(#gridPattern)")
      .attr("x", "0")
      .attr("y", "0")
      .attr("width", "0")
      .attr("height", "0")
      .attr("visibility", "hidden");
    //Pannable and Zoomable Elements
    this.main = this.svg
      .append("svg:g")
      .attr("transform", "translate(0) scale(1)")
      .attr("class", "main");
    //Highlight on over layer
    this.main.append("svg:rect")
      .attr("class", "graph-highlight")
      .attr("fill", '#000000')
      .attr("fill-opacity", 0.20)
      .attr("rx", 5)
      .attr("ry", 5);
    //ThemeLines layer
    this.main.append("svg:g")
      .attr("class", "themeLines");
    //Boxs layer
    this.main.append("svg:g")
      .attr("class", "boxes");
    //Links layer
    this.main.append("svg:g")
      .attr("class", "links");
    //Alignment Helper
    this.main.append("svg:line")
      .attr("class", "graph-alignmentH")
      .attr("fill-opacity", 0)
      .attr("stroke", "#ff0000")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5)
      .attr("stroke-dasharray", "3,3");
    this.main.append("svg:line")
      .attr("class", "graph-alignmentV")
      .attr("fill-opacity", 0)
      .attr("stroke", "#ff0000")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5)
      .attr("stroke-dasharray", "3,3");
    //Nodes layer
    this.main.append("svg:g")
      .attr("class", "nodes");
    //Selector layer
    this.main.append("svg:g")
      .attr("class", "selectors")
      .attr("visibility", "hidden");
    //GraphSelector layer
    this.main.append("svg:rect")
      .attr("class", "graph-selector")
      .attr("fill", '#000000')
      .attr("fill-opacity", 0.05)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,3")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("stroke", '#000000');
    this.svg.eventHandler = new graphEvent(this);
  }

};

Graph.prototype.setSize = function(size) {
  if (this.isSVG) {
    this.svg.attr('width', size[0]);
    this.svg.attr('height', size[1]);
    var grid = g.svg.select(".grid");
    grid.attr('width', size[0]);
    grid.attr('height', size[1]);
  }
  if (this.isCanvas) {
    this.canvas.attr('width', size[0]);
    this.canvas.attr('height', size[1]);
    this.canvas.eventHandler.draw();
  }
};

Graph.prototype.translateX = function(val) {
  this.main.node().transform.baseVal.getItem(0).matrix.e = val ? val : false;
  return this.main.node().transform.baseVal.getItem(0).matrix.e;
};

Graph.prototype.translateY = function(val) {
  this.main.node().transform.baseVal.getItem(0).matrix.f = val ? val : false;
  return this.main.node().transform.baseVal.getItem(0).matrix.f;
};

Graph.prototype.scale = function(val) {
  this.main.node().transform.baseVal.getItem(0).matrix.a = val ? val : false;
  this.main.node().transform.baseVal.getItem(0).matrix.d = val ? val : false;
  return this.main.node().transform.baseVal.getItem(0).matrix.a;
};

Graph.prototype.get = function(id) {
  return this.all[id];
};

Graph.prototype.getNodes = function(box) {
  var nodes = [];
  for (var i in this.nodes) {
    var n = this.nodes[i].getCenter();
    if (n.x >= box[0][0] && n.x <= box[1][0] && n.y >= box[0][1] && n.y <= box[1][1]) {
      nodes.push(this.nodes[i]);
    }
  }
  return nodes;
};

// Return a list of edges {source:e1, target:e2} from a multi node relation
Graph.prototype.getClique = function(entity) {
  var clique = [];
  var hashes = [];
  var linked = entity.connectRefs();
  for (var i in linked) {
    for (var j in linked) {
      e1 = linked[i];
      e2 = linked[j];
      if (e1 != e2) {
        var hash = Entity.hash([this.get(e1), this.get(e2)]);
        if (hashes.includes(hash)) {
          continue;
        } else {
          hashes.push(hash);
          clique.push({
            source: e1,
            target: e2
          });
        }
      }
    }
  }
  return clique;
};

Graph.prototype.getLayoutInfo = function() {
  //TODO: if no change since last call
  var nodes = [];
  var links = [];
  for (var i in this.all) {
    var e = this.all[i];
    if (e.type == 0) {
      nodes.push(e);
    } else {
      if (e.connectCount() > 2) {
        var clique = this.getClique(e);
        clique.forEach(function(v) {
          links.push(v);
        }, links);
      } else if (e.connectCount() == 2) {
        links.push(e);
      }
    }
  }
  return {
    nodes: nodes,
    links: links
  };
};

Graph.prototype.getData = function() {
  var data = {};
  for (var i in this.all) {
    var d = this.all[i].getData();
    d.connect = this.all[i].connectRefs();
    data[i] = d;
  }
  return data;
};

Graph.prototype.setData = function(data) {
  var e = null;
  for (var id in data) {
    e = data[id];
    if (e.type == 0) {
      var node = new Node({
        id: e.id
      });
      node.setData(e, this);
      node.connect = {};
      this.nodes[node.id] = node;
      node.create();
      node.selector = new Selector(this, node);
      node.redraw();
      node.redrawLabels();
    }
  }

  for (var id in data) {
    e = data[id];
    var entity = null;

    if (e.type == 0) {
      continue;
    } else if (e.type == 1) {
      entity = new Link({
        id: e.id
      });
    } else if (e.type == 2) {
      entity = new Box({
        id: e.id
      });

    } else if (e.type == 3) {
      entity = new Polygon({
        id: e.id
      });
    }

    entity.setData(e, this);
    entity.selector = new Selector(this, entity);
    entity.connect = {};
    for (var i in e.connect) {
      var eid = parseInt(e.connect[i]);
      entity.connect[e.connect[i]] = this.get(eid);
      this.get(eid).connect[entity.id] = entity;
    }

    if (entity.type == 1) {
      if (!this.relations[entity.hash()]) {
        this.relations[entity.hash()] = {};
      }
      this.relations[entity.hash()][entity.space] = entity;
    }
    entity.create();
    entity.redraw();
    entity.redrawLabels();
  }
};

Graph.prototype.redraw = function() {
  if (this.isSVG) {
    for (var i in this.nodes) {
      this.nodes[i].redraw();
      this.nodes[i].updateConnect();
    }
  } else if (this.isCanvas) {
    this.canvas.eventHandler.draw();
  }
  // for (var i in this.all){
  // if (this.all[i].type != 0)
  // this.all[i].redraw();
  // }
};

Graph.prototype.checkMinDate = function(date) {
  if (!this.minDate) {
    this.minDate = date;
  } else if (date.getTime() < this.minDate.getTime()) {
    this.minDate = date;
  }
  return this.minDate;
};

Graph.prototype.getDateZones = function() {
  var dates = [];
  var map = {};
  for (var id in this.all) {
    var d = this.all[id].startDateTime;
    if (d) {
      dates.push(d.getTime());
      map[d.getTime()] = {
        date: d,
        entity: id
      };
    }
  }
  dates.sort();

  this.timeZones = [];
  this.zonesByEntity = {};
  for (var i = 0; i < dates.length - 1; i++) {
    var e1 = map[dates[i]].entity;
    var e2 = map[dates[i + 1]].entity;
    var zone = {
      start: map[dates[i]].date.toGMTString(),
      end: map[dates[i + 1]].date.toGMTString(),
      magnify: 1,
      unit: Timeline.DateTime.DAY,
      estart: e1,
      eend: e2,
      delta: map[dates[i + 1]].date.getTime() - map[dates[i]].date.getTime()
    };
    this.timeZones.push(zone);
    this.zonesByEntity[e1].start = this.zonesByEntity[e1] ? zone : {
      start: zone
    };
    this.zonesByEntity[e2].end = this.zonesByEntity[e2] ? zone : {
      end: zone
    };
  }
  return this.timeZones;
};

/**
 * Create a node
 *
 *@param {Object} params Object with visualData of the Node
 */
Graph.prototype.createNode = function(params) {
  this.ctrl.addAction(Action.createNode, {
    e: params,
    g: this
  });
  return this.ctrl.run();
};

/**
 * Create a relation
 *
 *@param {String} type 'link', 'box', 'polygon'
 *@param {[Entity]} entities Array of connected Entity
 *@param {String} properties The new Relation parameters
 */
Graph.prototype.createRelation = function(type, entities, properties) {
  this.ctrl.addAction(Action.createRelation, {
    type: type,
    linked: entities,
    prop: properties,
    g: this
  });
  return this.ctrl.run();
};

Graph.prototype.undo = function() {
  this.ctrl.undo();
};

Graph.prototype.redo = function() {
  this.ctrl.redo();
};

Graph.prototype.stepTo = function(number) {
  this.ctrl.stepTo(number);
};

Graph.prototype.history = function() {
  return this.ctrl.getStack();
};

Graph.prototype.selector = function() {
  return this.svg.select(".selectors");
};

Graph.prototype.hideSelector = function() {

  if (this.isSVG) {
    this.svg.select(".selectors").selectAll('.selector')
      .attr("visibility", "hidden");
  }
};

Graph.prototype.hideHighlight = function() {
  if (this.isSVG) {
    this.svg.select(".graph-highlight")
      .attr('visibility', 'hidden');
  }
};

Graph.prototype.hideAlignmentHelper = function() {
  if (this.isSVG) {
    this.svg.select(".graph-alignmentH")
      .attr('visibility', 'hidden');
    this.svg.select(".graph-alignmentV")
      .attr('visibility', 'hidden');
  }
};

Graph.prototype.hideGraphSelector = function() {
  if (this.isSVG) {
    this.svg.select(".graph-selector")
      .attr('visibility', 'hidden');
  }
};

Graph.prototype.hideHelpers = function() {
  this.hideSelector();
  this.hideHighlight();
  this.hideGraphSelector();
  this.hideAlignmentHelper();
};

Graph.prototype.pos = function(x, y) {
  //Get Size of the Canvas
  var size = Interface.get().canvasSize();
  var bounds = [
    [0, 0], size
  ];
  var canvasPos = [x - $('#graph_' + this.id).offset().left, y - $('#graph_' + this.id).offset().top];
  var graphPos = [];
  for (var i = 0; i < 2; ++i) {
    var wantedPos = canvasPos[i];
    var pos = Math.min(Math.max(wantedPos, bounds[0][i]), bounds[1][i]);
    graphPos.push(parseInt(pos));
  }
  return this.screenToCanvas(graphPos);
};

Graph.prototype.screenToCanvas = function(pos) {
  return pos.x ? {
    x: (pos.x - this.translateX()) / this.scale(),
    y: (pos.y - this.translateY()) / this.scale()
  } : [(pos[0] - this.translateX()) / this.scale(),
    (pos[1] - this.translateY()) / this.scale()
  ];
};

Graph.prototype.snap = function(pos) {
  return pos.x ? {
    x: this.gridSize * Math.round(pos.x / this.gridSize),
    y: this.gridSize * Math.round(pos.y / this.gridSize)
  } : [this.gridSize * Math.round(pos[0] / this.gridSize),
    this.gridSize * Math.round(pos[1] / this.gridSize)
  ];
};

Graph.prototype.visibleArea = function() {
  var $g = $('#graph_' + this.id);
  return [this.screenToCanvas([0, 0]),
    this.screenToCanvas([$g.width(), $g.height()])
  ];
};
