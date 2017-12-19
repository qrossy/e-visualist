/**
 * Actions
 * Every action made by the user with undo/redo
 * @constructor
 */
function Action() {}
var params = {};
var undo = false;



/**
 * Create Node
 *
 *@param {{e:Object, g:Graph}} params Node params and Graph
 *@param {Boolean} undo
 */

Action.createNode = function CreateNode(params, undo) {
  if (!undo) {
    if (params.e.toString() == '[object Object]') {
      var node = new Node(params.e);
      params.e = node;
    }
    params.g.nodes[params.e.id] = params.e;
    Action.add(params, undo);
    return params.e;
  } else {
    Action.add(params, undo);
    delete params.g.nodes[params.e.id];
  }
  return params.e;
};

/**
 * Create Relation
 *
 *@param {{type:String, linked:[Node,..], g:Graph, prop:properties}} params Relation params and Graph
 *@param {Boolean} undo
 */

Action.createRelation = function CreateRelation(params, undo) {
  if (!undo) {
    if (!params.e) {
      if (params.type == 'link') {
        var entity = new Link(params.prop);
      } else if (params.type == 'box') {
        var entity = new Box(params.prop);
      } else if (params.type == 'polygon') {
        var entity = new Polygon(params.prop);
      }
      if (params.linked.length == 2) {
        entity.source = typeof(params.linked[0]) == 'number' ? params.g.get(params.linked[0]) : params.linked[0];
        entity.target = typeof(params.linked[1]) == 'number' ? params.g.get(params.linked[1]) : params.linked[1];
      }
      params.e = entity;
    }
    for (var i in params.linked) {
      var e = typeof(params.linked[0]) == 'number' ? params.g.get(params.linked[i]) : params.linked[i];
      params.e.addConnect(e);
    }
    //Manage position of link (if more than one link between entities)
    if (params.e.type == 1) {
      if (!params.g.relations[params.e.hash()]) {
        params.g.relations[params.e.hash()] = {
          0: params.e
        };
        params.e.space = 0;
      } else {
        var space = Object.keys(params.g.relations[params.e.hash()]).length;
        params.g.relations[params.e.hash()][space] = params.e;
        params.e.space = space;
      }
    }
    Action.add(params, undo);
  } else {
    Action.add(params, undo);
    if (params.type == 'link') {
      delete params.g.relations[params.e.hash()][params.e.space];
    }
    for (var i in params.linked) {
      params.e.removeConnect(params.linked[i]);
    }
  }
  return params.e;
};

/**
 * Create Corner
 *
 * @param {g:Graph, e:Link, dist:float, index:int, id:String} params
 */
Action.createCorner = function CreateCorner(params, undo) {
  var path;
  var links = params.g.relations[params.e.hash()];
  if (params.e.connectCount() == 2) {
    path = links[0].getMainPath();
  } else {
    path = links[0].svg.select(".e" + params.id);
  }
  var segments = path.node().getPathData();
  if (!undo) {
    var prev = segments.getItem(params.index - 1);
    var next = segments.getItem(params.index);
    var v = Link.vector(prev, next);
    var point = {
      type: "L",
      x: prev.x + v.x * params.ratio,
      y: prev.y + v.y * params.ratio
    };
    segments.insertItemBefore(point, params.index);
  } else {
    segments.removeItem(params.index);
  }
  path.attr("d", segments.path());
  for (var id in links) {
    links[id].redraw();
  }
};

/**
 * Move Corner
 *
 * @param {d:d, path:path} params d = pathSegments and path = <Path>
 */
Action.moveCorner = function MoveCorner(params, undo) {
  var oldd = params.path.attr('d');
  params.path.attr('d', params.d);
  params.d = oldd;
};


/**
 * Remove Corner
 *
 * @param {g:Graph, e:Link, index:int, id:String} params
 */
Action.removeCorner = function RemoveCorner(params, undo) {
  var path;
  var links = params.g.relations[params.e.hash()];
  if (params.e.connectCount() == 2) {
    path = links[0].getMainPath();
  } else {
    path = links[0].svg.select("." + params.id);
  }
  var segments = path.node().getPathData();
  if (!undo) {
    var p = segments.getItem(params.index);
    params.point = {
      type: "L",
      x: p.x,
      y: p.y
    };
    segments.removeItem(params.index);
  } else {
    segments.insertItemBefore(params.point, params.index);
  }
  path.attr("d", segments.path());
  for (var id in links) {
    links[id].redraw();
  }
};

/**
 * Add Entity
 *
 *@param {e:Entity, g:Graph} entity New instance of Node, Link, Box or Polygon
 */
Action.add = function Add(params, undo) {
  if (!undo) {
    params.e.g = params.g;
    params.e.create();
    //TODO handle selector for canvas
    if (params.g.renderer == 'svg'){
      params.e.selector = new Selector(params.g, params.e);
    }
    params.g.all[params.e.id] = params.e;
    params.e.redraw();
    if (params.e.startDateTime) {
      params.e.addToTimebar();
    }
  } else {
    params.e.svg.remove();
    if (params.g.renderer == 'svg'){
      params.e.selector.svg.remove();
    }
    delete params.g.all[params.e.id];
    delete params.e.eventHandler;
    for (var i in params.e.connect) {
      delete params.e.connect[i].connect[params.e.id];
    }
  }
};

/**
 * Remove Entity
 *
 *@param {e:Entity, g:Graph} params
 */
Action.removeEntity = function RemoveEntity(params, undo) {
  if (params.e.type == 0) {
    Action.removeNode(params, undo);
  } else if (params.e.type == 1) {
    Action.removeLink(params, undo);
  } else if (params.e.type == 2 || params.e.type == 3) {
    Action.removeBox(params, undo);
  }
};

/**
 * Remove Node
 *
 *@param {e:Node, g:Graph} params
 */
Action.removeNode = function RemoveNode(params, undo) {
  if (!undo) {
    params.e.svg.remove();
    delete params.g.all[params.e.id];
    delete params.g.nodes[params.e.id];
    for (var id in params.e.connect) {
      var c = params.e.connect[id];
      c.svg.remove();
      if (c.type == 1) {
        delete params.g.relations[c.hash()];
      }
      //remove Reference to connected Nodes
      for (var id in c.connect) {
        id != params.e.id ? delete c.connect[id].connect[c.id] : false;
      }
    }
  } else {
    params.g.all[params.e.id] = params.e;
    params.g.nodes[params.e.id] = params.e;
    params.e.create();
    params.e.redraw();
    for (var id in params.e.connect) {
      var c = params.e.connect[id];
      if (c.type == 1) {
        typeof(params.g.relations[c.hash()]) == 'undefined' ?
        params.g.relations[c.hash()] = {
            0: c
          }:
          params.g.relations[c.hash()][c.space] = c;
      }
      for (var id in c.connect) {
        id != params.e.id ? c.connect[id].connect[c.id] = c : false;
      }
      try {
        //fail if connected node is absent (if batch delete)
        c.create();
        c.redraw();
      } catch (err) {
        //nothing to do, relation will be created by last connected node
        continue;
      }
    }
  }
};

/**
 * Remove Link
 *
 *@param {e:Link, g:Graph} params
 */
Action.removeLink = function RemoveLink(params, undo) {
  var links = params.g.relations[params.e.hash()];
  if (!undo) {
    params.e.svg.remove();
    delete params.g.all[params.e.id];
    delete links[params.e.space];
    for (var s in links) {
      if (s > params.e.space) {
        var l = links[s];
        delete links[s];
        l.space -= 1;
        links[l.space] = l;
        if (l.space == 0) {
          l.addMainPath();
          l.setMainPath(params.e.getMainPath().attr('d'));
        }
        l.redraw();
      }
    }
    for (var id in params.e.connect) {
      delete params.e.connect[id].connect[params.e.id];
    }
  } else {
    params.g.all[params.e.id] = params.e;
    if (Object.keys(links).length > 0) {
      for (var s in links) {
        if (s >= params.e.space) {
          var l = links[s];
          delete links[s];
          if (s == params.e.space) {
            links[s] = params.e;
            params.e.create();
            params.e.redraw();
          }
          l.space += 1;
          links[l.space] = l;
          l.redraw();
        }
      }
    }
    links[params.e.space] = params.e;
    params.e.create();
    params.e.redraw();
    for (var id in params.e.connect) {
      params.e.connect[id].connect[params.e.id] = params.e;
    }
  }
};

/**
 * Remove Box
 *
 *@param {e:Box || Polygon, g:Graph} params
 */
Action.removeBox = function RemoveBox(params, undo) {
  if (!undo) {
    params.e.svg.remove();
    delete params.g.all[params.e.id];
    for (var id in params.e.connect) {
      delete params.e.connect[id].connect[params.e.id];
    }
  } else {
    params.g.all[params.e.id] = params.e;
    params.e.create();
    params.e.redraw();
    for (var id in params.e.connect) {
      params.e.connect[id].connect[params.e.id] = params.e;
    }
  }
};

/**
 * Move Node
 *
 *@param {e:Node, pos:newPos} params
 */
Action.move = function Move(params, undo) {
  var oldPos = params.e.getPosition();
  params.e.x = params.pos.x ? params.pos.x : params.pos[0];
  params.e.y = params.pos.y ? params.pos.y : params.pos[1];
  params.e.redraw();
  params.e.updateConnect(); //? need to redraw connect !
  params.pos = oldPos;
};

/**
 * Resize Node
 *
 *@param {e:Node, box:[x,y,w,h]} params
 */
Action.resize = function Resize(params, undo) {
  var oldBox = params.e.bBox();
  params.e.setBox(params.box);
  params.e.redraw();
  params.e.updateConnect();
  params.box = oldBox;
};



/**
 * Change visual property of an Entity
 *
 *@param {e:Entity, data:Entity.getData()} params
 */
Action.change = function ChangeProperties(params, undo) {
  var oldData = params.e.getData();
  params.e.setData(params.data);
  params.e.create();
  params.e.redraw();
  params.e.updateConnect();
  params.data = oldData;
};

/**
 * Change Label
 *
 *@param {l:Label, txt:html} params
 */
Action.changeLabel = function ChangeLabel(params, undo) {
  var oldData = params.l.getHtml();
  params.l.setHtml(params.txt);
  params.l.redraw();
  params.l.e.updateConnect();
  params.txt = oldData;
};

/**
* Change Entity renderer
*
*@param {Entity} entity Entity to change
#@param {String} type 'node', 'link', 'box', 'polygon'
*/
Action.renderAs = function renderAs(params, undo) {
  if (type == 'link') {
    n = new Link(entity.getData());
    this.all[n.id] = n;
    n.create();
    entity.svg.remove();
    delete entity;
  }
};


/**
 * Composite
 *
 *@param {{actions:[{func:action,d:data},...], e:name}} params
 *@param {Boolean} undo
 */
Action.composite = function Composite(params, undo) {
  for (var id in params.actions) {
    params.actions[id].func(params.actions[id].d, undo);
  }
};

/**
 * Empty
 *
 *@param {} params
 *@param {Boolean} undo
 */
Action.empty = function Start(params, undo) {};
