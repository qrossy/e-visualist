/**
* Class variables
* @param {number} nextId Store next available id
*/
Entity.nextId = 0;

/**
* Entity
* Pattern: anything displayed is an entity (node, link, box, etc.)
* @constructor
* @param {number} id Given or autoint
* @param {int} type Id of the Entity Type i.e. the semantic class of the entity
* @param {number} x xPosition
* @param {number} y yPosition
*/
function Entity(params)
{
	Entity.nextId ++;
	if (!params) params = new Object();
	params.id ? this.id = params.id : this.id = Entity.nextId;
	this.id > Entity.nextId ? Entity.nextId = (this.id + 1) : false;
	
	params.connect ? this.connect = params.connect : this.connect = new Object();
	params.x ? this.x = params.x : this.x = 0;
	params.y ? this.y = params.y : this.y = 0;
	params.color ? this.color = params.color : this.color = '#000000';
	params.g ? this.g = params.g : this.g = null;
	params.startDateTime ? this.startDateTime = params.startDateTime : this.startDateTime = null;
	params.endDateTime ? this.endDateTime = params.endDateTime : this.endDateTime = null;
	params.ctrlDateTime ? this.ctrlDateTime = params.ctrlDateTime : this.ctrlDateTime = 0;
	params.labels ? this.labels = params.labels : this.labels = null; //[new Label({e:this})]
	delete params;
	
	this.getMainData = function()
	{
		return {
			id: this.id,						// Autoid
			connect: this.connect, 				// Reference to connected Entities {id:Entity, ...}
			type: this.type, 					// 0 = Node, 1 = Link, 2 = Box, 3 = Polygon
			x: this.x,							// xPos on Graph
			y: this.y,							// yPos on Graph
			color: this.color,					// fill and Stroke Color
			startDateTime: this.startDateTime, 	// JsDate Object
			endDateTime: this.endDateTime,		// JsDate Object
			ctrlDateTime: this.ctrlDateTime, 	// 0 = free, 1 = Between move, 2 = Controlled
			labels : this.labelInfo(),			// List of textLabels
			};
	}
	
	this.setData = function(data, g)
	{
		this.g = g ? g : this.g;
		this.g.all[this.id] = this;
		for (var id in data){
			if (id == 'labels'){
				// this.labels = [];
				// for (var i in data[id]){
					// data[id][i].e = this;
					// var l = new Label(data[id][i]);
					// this.labels.push(l);
				// }
			}
			else if (id == 'source' || id == 'target'){
				this[id] = this.g.get(parseInt(data[id]));
			}
			else{
				this[id] = data[id];
			}
		}
	}
    
	this.labelInfo = function()
	{
		if (!this.labels){
			return null;
		}
		var infos = [];
		for (var l in this.labels){
			infos.push(this.labels[l].getData());
		}
		return infos;
	}
	
	this.addConnect = function(entity)
	{
		this.connect[entity.id] = entity;
		entity.connect[this.id] = this;
	}
	
	this.removeConnect = function(entity)
	{
		delete this.connect[entity.id];
		delete entity.connect[this.id];
	}

	this.updateConnect = function()
	{
		//log('updateConnect for '+this.id);
		for (var id in this.connect){
			this.connect[id].connect[this.id] = this;
			this.connect[id].redraw();
		}
	}
	
	this.connectCount = function()
	{
		return Object.keys(this.connect).length;
	}

	this.connectRefs = function()
	{
		var refs = [];
		for (var id in this.connect){
			refs.push(id);
		}
		return refs;
	}
	/**
	* Get connected Entities
	* Recursive function
	*@param {[int,...]} filters Filter Entities by type, length of the array define the depth
	*@return {Object.<int, Entity>} connected
	*/
	this.findConnected = function(filters)
	{
		var type = filters.shift();
		var connected = {};
		for (var id in this.connect){
			if (this.connect[id].id == this.id){
			}
			else if (type == null || connected[id].type == type){
				if (filters.length > 0){
					merge(connected, this.connect[id].findConnected(filters));
				}
				else{
					connected[id] = this.connect[id];
				}
			}
		}
		return connected;
	}

	this.getPosition = function()
	{
		return {x:this.x, y:this.y};
	}
	
	this.hash = function()
	{
		return Entity.hash(this.connect);
	}
	
	this.addToTimebar = function()
	{
		var evt = new Timeline.DefaultEventSource.Event({
			id: ""+this.id,
			start: this.startDateTime,
			end: this.endDateTime?this.endDateTime:this.startDateTime,
			instant : true,
			text : "",
			description : "A description",
			icon : "js/api/timeline_js/images/gray-circle.png"
		});
		this.g.timeBarEventSource.add(evt);
		Interface.UpdateTimebar();
		var band = Interface.timebar.getBand(0);
		if (this.ctrlDateTime != 0){
			this.x = band._ether.dateToPixelOffset(this.startDateTime);
			if (this.w) { this.x -= this.w/2;}
			this.redraw();
		}
	}
	
	this.redrawLabels = function()
	{
		for (var i in this.labels){
			this.labels[i].redraw();
		}
	}
	
	this.createLabels = function()
	{
		for (var i in this.labels){
			this.labels[i].create();
		}
	}
}

Entity.hash = function(nodes)
{
	var a = [];
	for (var id in nodes){
		var id = typeof(nodes[id]) == 'number' ? nodes[id] : nodes[id].id;
		a.push(id);
	}
	a.sort();
	var hash = '';
	for(var id in a){hash += 'e'+a[id]}
	return hash;
}


