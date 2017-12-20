/**
* Controller
* Manage every action with undo/redo
* @constructor
*/
function Controller()
{
	this.actionStack = new Array();
	this.actionPtr = -1;
	this.addAction(Action.empty, {});
	this.run();
}

/**
* add Action to stack
*@param {function} action Function of the action
*@param {Object} data Object affected by the action
*@param {Boolean} bool If true = undo
*/
Controller.prototype.addAction = function(action, data)
{
	if (this.actionPtr < this.actionStack.length-1)
	{
		this.actionStack = this.actionStack.slice(0, this.actionPtr+1);
		this.actionPtr = this.actionStack.length-1;
	}
	var n;
	if (data.hasOwnProperty('name')){n = data.name;}
	else{
		n = action.toString();
		n = n.substr('function '.length);
		n = n.substr(0, n.indexOf('('));
	}

	this.actionStack.push({func:action, d:data, name:n});
}

/**
* add a batch of Action
*@param {Array} actions [[action, data],...]
*@param {String} name Name of the batchAction
*/
Controller.prototype.addBatch = function(actions, name)
{
	var batch = new Array();
	for (var id in actions){
		batch.push({func:actions[id][0], d:actions[id][1]});
	}
	this.addAction(Action.composite, {actions:batch, name:name});
}

/**
* Run action
*
*/
Controller.prototype.run = function()
{
	this.actionPtr++;
	var action = this.actionStack[this.actionPtr];
	var r = action.func(action.d, false);
	Interface.get().updateHistory();
	return r;
}

/**
* Undo action
*
*/
Controller.prototype.undo = function()
{
	assert(this.actionPtr >= 0 && this.actionPtr < this.actionStack.length);
	assert(this.actionStack.length > 1 && this.actionPtr > 0);
	var action = this.actionStack[this.actionPtr];
	action.func(action.d, true);
	--this.actionPtr;
}

/**
* Redo action
*
*/
Controller.prototype.redo = function()
{
	assert(this.actionPtr >= 0 && this.actionPtr < this.actionStack.length);
	assert(this.actionStack.length > 1 && this.actionPtr < this.actionStack.length-1);
	++this.actionPtr;
	var action = this.actionStack[this.actionPtr];
	action.func(action.d, false);
}

/**
* Step to
*
*/
Controller.prototype.stepTo = function(pointer)
{
	if (pointer == this.actionPtr){
		return;
	}
	else if (pointer < this.actionPtr){
		while (this.actionPtr > pointer){
			this.undo();
		}
	}
	else{
		while (this.actionPtr < pointer){
			this.redo();
		}
	}
	Interface.get().updateHistory();
}

/**
* Return Stack and Pointer
*
*/
Controller.prototype.getStack = function()
{
	return [this.actionStack, this.actionPtr];
}
