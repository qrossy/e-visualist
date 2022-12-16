
/**
* All the Interface
* Interface is the Application Singleton
* @constructor call by the method get()
*/

Interface.instance = null;

Interface.get = function() {
	if (this.instance == null) {
		this.instance = new Interface();
	}
	return this.instance;
};

Interface.icons = null;
Interface.colors = [
	"#000000", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
	"#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#ffffff"
];

Interface.addingLink = false;
Interface.addingCorner = false;
Interface.entityType = 0;
Interface.dragging = false;
Interface.modifiedEntity = null;
Interface.modifiedLabel = null;
Interface.selectedCorner = null;
Interface.timebar = null;
Interface.resizeTimerID = null;
Interface.padding = false;

Interface.timeBarParams = {
	width:          "70%",
	intervalUnit:   Timeline.DateTime.DAY,
	intervalPixels: 100,
	fixInterval: 	100,
	timeZone:       0,
};

Interface.timeBarTheme = Timeline.ClassicTheme.create();
Interface.timeBarTheme.autoWidth = false;
Interface.timeBarTheme.firstDayOfWeek = 1;
Interface.timeBarTheme.event.tape.height = 7; // px
Interface.timeBarTheme.event.track.height = 10;
Interface.timeBarTheme.event.track.autoWidthMargin = 1;
Interface.timeBarTheme.event.track.gap = 0;
Interface.timeBarTheme.event.overviewTrack.height = 0;
Interface.timeBarTheme.event.overviewTrack.autoWidthMargin = 1;
Interface.timeBarTheme.event.overviewTrack.gap = 0;
Interface.timeBarTheme.event.instant.iconWidth = 4;
Interface.timeBarTheme.event.instant.iconHeight = 4;

Interface.timeBarBandInfos = [
	Timeline.createHotZoneBandInfo({
		zones: 			[],
		width:          Interface.timeBarParams.width,
		intervalUnit:   Interface.timeBarParams.intervalUnit,
		intervalPixels: Interface.timeBarParams.intervalPixels,
		timeZone:       Interface.timeBarParams.timeZone,
		eventSource: 	null,
		theme:			Interface.timeBarTheme,
	}),
	Timeline.createBandInfo({
		width:          "30%",
		intervalUnit:   Timeline.DateTime.MONTH,
		overview:       true,
		eventSource: 	null,
		theme:			Interface.timeBarTheme,
		intervalPixels: Interface.timeBarParams.intervalPixels,
		zoomIndex:      5,
		zoomSteps:      new Array(
			// {pixelsPerInterval: 280,  unit: Timeline.DateTime.HOUR},
			// {pixelsPerInterval: 140,  unit: Timeline.DateTime.HOUR},
			// {pixelsPerInterval:  70,  unit: Timeline.DateTime.HOUR},
			// {pixelsPerInterval:  35,  unit: Timeline.DateTime.HOUR},
			// {pixelsPerInterval: 400,  unit: Timeline.DateTime.DAY},
			{pixelsPerInterval: 200,  unit: Timeline.DateTime.DAY},
			{pixelsPerInterval: 100,  unit: Timeline.DateTime.DAY},
			{pixelsPerInterval:  50,  unit: Timeline.DateTime.DAY},
			{pixelsPerInterval: 400,  unit: Timeline.DateTime.MONTH},
			{pixelsPerInterval: 200,  unit: Timeline.DateTime.MONTH},
			{pixelsPerInterval: 100,  unit: Timeline.DateTime.MONTH}, // DEFAULT zoomIndex
			{pixelsPerInterval: 50,  unit: Timeline.DateTime.MONTH},
			{pixelsPerInterval: 200,  unit: Timeline.DateTime.YEAR},
			{pixelsPerInterval: 100,  unit: Timeline.DateTime.YEAR}
		)
	})
];

function Interface()
{
	if ( Interface.caller != Interface.get ) {
		throw new Error("Interface is a Singleton, call it with Interface.get()");
	}
}

Interface.prototype.setKeyEvents = function()
{
	$(document).on("keydown", function(event) {
		if(event.keyCode == 18){ // click Alt to add link !
			if (!Interface.addingLink){
				Interface.addingLink = {};
				Interface.addingLink.type = 'link';
				Interface.addingLink.color = "grey";
			}
		}
	});
	
	$(window).on("keyup", function(event) {
		if(event.keyCode == 18){
			// event.preventDefault();
			// event.stopPropagation();
			Interface.addingLink = false;
		}
	});

	$(document).on("keyup", function(event) {
		//log(event.target.tagName);
		if((event.keyCode == 8 || event.keyCode == 46) && event.target.tagName == 'BODY'){
			var g = Interface.get().currentGraph;
			if (Interface.selectedCorner){
				var info = Interface.selectedCorner.attr('class').split('_');
				g.ctrl.addAction(Action.removeCorner, {
					g: g,
					e: g.get(Interface.selectedCorner.parent().attr('entity')),
					index: parseInt(info[2]),
					id: info[0]});
					g.ctrl.run();
					Interface.selectedCorner = false;
				}
				else{
					var actions = [];
					g.svg.select('.selectors').selectAll('[visibility="visible"]').each(function(){
						var e = g.get($(this).attr('entity'));
						actions.push([Action.removeEntity, {e:e, g:g}]);
					});
					if (actions.length != 0){
						g.ctrl.addBatch(actions, 'Delete');
						g.ctrl.run();
					}
				}
			}
		});
	};

	Interface.prototype.init = function()
	{
		//Add TabManager for Adding Graphs
		var mainTabs = $('<div class="center-tabs"><ul></ul></div>');
		$('.ui-layout-center').append(mainTabs);
		mainTabs
		.tabs({
			tabTemplate: '<li><a href="#{href}">#{label}&nbsp;&nbsp;&nbsp;<span class="ui-icon ui-icon-close tab_icon">Remove Tab</span></a></li>',
			add: function(event, ui) {
				$(ui.panel).addClass('visualist_graph');
				$(ui.panel).addClass('ui-layout-content');
				$(ui.tab).on('click', 'span.ui-icon-close', function() {
					var g = Interface.get().currentGraph;
					if (g){
						g.svg.remove();
						$('#graph_'+g.id).remove();
						delete g;
						var index = $( "li", mainTabs ).index( $( this ).parent() );
						// Remove the tab
						var tab = mainTabs.find( ".ui-tabs-nav li:eq("+index+")" ).remove();
						// Find the id of the associated panel
						var panelId = tab.attr( "aria-controls" );
						// Remove the panel
						$( "#" + panelId ).remove();
						// Refresh the tabs widget
						mainTabs.tabs( "refresh" );
					}
				});
			},
			activate: function(event, ui) {
				Interface.get().currentGraph = ui.newPanel.data('data');
				Interface.get().updateHistory(true);
				Interface.UpdateTimebar();
			},
		})
		.find( '.ui-tabs-nav').sortable({
			axis: 'x',
			start: function(event, ui) {
				//log(ui.helper.find('.ui-icon-close'));
				//ui.helper.find('.ui-icon-close').remove();
			},
		});
		Interface.timebarDiv = $('<div class="visualist_timebar" id="visualist_timebar" style="height:60px;"></div>');
		$('.center-tabs').append(Interface.timebarDiv);
		Interface.timeBarBandInfos[1].syncWith = 0;
		Interface.timeBarBandInfos[1].highlight = true;
		Interface.timebar = Timeline.create(document.getElementById("visualist_timebar"), Interface.timeBarBandInfos);

		this.popupDiv = $('<div class="visualist_popup" id="visualist_popup"></div>').draggable();
		$('body').append(this.popupDiv);

		//Setup Toolbar
		var toolbar = $('.ui-layout-north');
		//New Graph
		toolbar.append($('<a class="toolbar_tool ui-widget" title="New Graph"><span class="ui-icon ui-icon-document inline_icon"></span>&nbsp;&nbsp;&nbsp;</a>')
		.button().on("click", function(e) {
			e.preventDefault();
			$(this).trigger('blur');
			var g = new Graph();
			$( '<li><a href=#graph_'+g.id+'>NewGraph::'+g.id+'</a></li>' ).appendTo( '.center-tabs .ui-tabs-nav' );
			$( '.center-tabs' ).tabs( 'refresh' );
			$( '<div id=graph_'+g.id+' style="padding: 0em 0em;"></div>' ).appendTo( '.center-tabs' );
			$('#graph_'+g.id).data('data', g);
			Interface.get().currentGraph = g;
			g.init();
			g.svg.attr('width', $('.ui-layout-center').width());
			g.svg.attr('height', $('.ui-layout-center').height());
			// Interface.get().updateHistory(true, g);
		}));
		//Open Graph
		toolbar.append($('<div style="float:left;"><form id="visualistOpen" name="viualistOpen" enctype="multipart/form-data" method="post" action="load.php" target="upload_target" ></div>'));
		toolbar.append($('<iframe id="upload_target" name="upload_target" src="#" style="width:0;height:0;border:0px solid #fff;"></iframe> '));//style="visibility:hidden"
		toolbar.append($('<a class="visualistLoad toolbar_tool ui-widget" title="Open Graph"><span class="ui-icon ui-icon-folder-open inline_icon"></span>&nbsp;&nbsp;&nbsp;</a>').button().trigger('file')); //.file()
		
		$('.visualistLoad').on("choose", function(e, input) {
			input.attr("name", "File");
			input.css("visibility", "hidden");
			$('#visualistOpen').append(input);
			$('#visualistOpen').submit();
			input.remove();
		});
		//Save Graph
		var form = $('<form id="visualistForm" name="viualistForm" method="post" action="save.php" style="float:right;">')
		.append('<input type="text" id="saveString" name="Content" style="visibility:hidden"/>')
		.append('<input type="text" id="graphName" name="Graph" style="visibility:hidden"/>');
		toolbar.append(form);
		toolbar.append($('<a class="toolbar_tool ui-widget" title="Save Graph" href="javascript:void(0);"><span class="ui-icon ui-icon-disk inline_icon"></span>&nbsp;&nbsp;&nbsp;</a>')
		.button().on("click", function(e) {
			e.preventDefault();
			$(this).trigger('blur');
			var g = Interface.get().currentGraph;
			$('#saveString').val(JSON.stringify(g.getData()));
			$('#graphName').val(g.name);
			$('#visualistForm').submit();
		}));
		//toolbar.append($('<span class="ui-icon-grip-dotted-vertical inline_icon">&nbsp;&nbsp;</span>'));

		//Layout
		toolbar.append($('<span class="toolbar_tool ui-widget"><a title="ForceLayout">forceLayout</a></span>')
		.button().on("click", function(e) {
			e.preventDefault();
			var g = Interface.get().currentGraph;
			g.hideHelpers();
			var size = Interface.get().canvasSize();
			var data = g.getLayoutInfo();
			var force = d3.layout.force()
			.nodes(data.nodes)
			.links(data.links)
			.size([size[0], size[1]])
			.distance(20)
			.charge(-10000)
			.gravity(0.5);

			force.on("tick", function(d) {
				if (d.alpha < 0.06){
					force.stop();
					g.redraw();
				}
			});
			force.start();
		}));

		//RandomGraph
		toolbar.append($('<span class="toolbar_tool ui-widget"><a title="RandomGraph">RandomGraph</a></span>')
		.button().on("click", function(e) {
			e.preventDefault();
			var graph = Interface.get().currentGraph;
			graph.hideHelpers();
			var size = Interface.get().canvasSize();
			var actions = new Array();
			var n = 10;
			for (var i = 0; i < n; i++){
				actions.push([Action.createNode, {e:{id:i, x:Math.random()*size[0],y:Math.random()*size[1],shape:2}, g:graph}]);
			}
			// Math.floor(Math.random()*3)
			var linkType = {0:'link', 1:'polygon',2:'box'};
			for (var i = 0; i < n*1.5; i++){
				var e1 = Math.floor(Math.random()*n)+1;
				var e2 = Math.floor(Math.random()*n)+1;
				if (e1 != e2){
					actions.push([Action.createRelation, {type:linkType[0], linked:[e1, e2], prop:{}, g:graph}]);
				}
			}
			graph.ctrl.addBatch(actions, 'RandomGraph');
			graph.ctrl.run();
			Interface.get().updateHistory();
			//Send size to SVG:
			Interface.get().onWindowSizeChanged();
		}));

		toolbar.append('<span class="toolbar_tool ui-widget"><input type="checkbox" id="showTimebar" /><label for="showTimebar">Timebar</label></span>');
		$("#showTimebar").on("click", function() {
			$("#visualist_timebar").is(':visible') ? $("#visualist_timebar").hide() : $("#visualist_timebar").show();
			Interface.get().onWindowSizeChanged();
		});
		$("#visualist_timebar").hide();
		$("#showTimebar").checked = false;
		$("#showTimebar").button();

		// LEFT PANEL
		//IconSelector Panel
		this.createIconSelector();

		// RIGHT PANEL
		var acc = $('<div id="west-accordion"></div>');
		// History Panel
		var historyHeader = $('<h3 id="west-history-header">History</h3>');
		var history = $('<div style="min-height: 200px;"><table class="visualist-history" style="display:block;"></table></div>');

		var undo = $('<a class="toolbar_tool" href="#undo"><span class="ui-icon ui-icon-arrowreturnthick-1-w inline_icon"></span>&nbsp;&nbsp;</a>')
		.button().on("click", function(e) {
			e.preventDefault();
			$(this).trigger('blur');
			var g = Interface.get().currentGraph;
			g.undo();
			Interface.get().updateHistory();
		});

		var redo = $('<a class="toolbar_tool" href="#redo"><span class="ui-icon ui-icon-arrowreturnthick-1-e inline_icon"></span>&nbsp;&nbsp;</a>')
		.button().on("click", function(e) {
			e.preventDefault();
			$(this).trigger('blur');
			var g = Interface.get().currentGraph;
			g.redo();
			Interface.get().updateHistory();
		});

		history.prepend(redo).prepend(undo);

		acc.append(historyHeader);
		acc.append(history);
		// Properties Panel
		acc.append('<h3>Properties</h3><div class="visualist-properties"></div>');

		acc.accordion({
			heightStyle: "fill",
			collapsible: false,
			fillSpace: true,
		});
		$('.ui-layout-east').append(acc);
		$('.ui-layout-south').remove();

		this.setKeyEvents();
	};

	/**
	* Load GraphFile
	*
	*@param {JSON}
	*/
	Interface.prototype.load = function(data)
	{
		var g = new Graph();
		$( '<li><a href=#graph_'+g.id+'>NewGraph::'+g.id+'</a></li>' ).appendTo( '.center-tabs .ui-tabs-nav' );
		$( '.center-tabs' ).tabs( 'refresh' );
		$( '<div id=graph_'+g.id+'></div>' ).appendTo( '.center-tabs' );
		$('#graph_'+g.id).data('data', g);
		Interface.get().currentGraph = g;
		g.init();
		g.svg.attr('width', $('.ui-layout-center').width());
		g.svg.attr('height', $('.ui-layout-center').height());
		g.setData(data);
	};

	/**
	* Update the Property Div
	*
	*@param {Entity} The Entity
	*/
	Interface.prototype.updateProperties = function(event)
	{
		var div = $('.visualist-properties');
		if(!div.is(":visible")){
			return;
		}
		var g = this.currentGraph;

		div.html('');
		var entity = event.e;
		if (!entity){
			div.append('<input type="checkbox" id="gridVisible" /><label for="gridVisible">Show grid</label>');
			$("#gridVisible").on("click", function() {
				if(g.gridVisible){
					g.gridVisible = false;
					g.svg.select(".grid").attr('visibility', 'hidden');
				}
				else{
					g.gridVisible = true;
					g.svg.select(".grid").attr('visibility', 'visible');
				}
			});
			if (g.gridVisible) $("#gridVisible").checked = true;
			// $("#gridVisible").button();
			div.append('<br/>');
			div.append('<input type="checkbox" id="snapToGrid" /><label for="snapToGrid">Snap to grid</label>');
			$("#snapToGrid").on("click", function(e) {
				g.snapToGrid ? g.snapToGrid = false : g.snapToGrid = true;
			});
			if (g.snapToGrid) $("#snapToGrid").checked = true;
			// $("#snapToGrid").button();
			div.append('<br/>');
			var gridSliderDiv = $('<div style="margin-left:5px;margin-top:5px;">');
			gridSliderDiv.append('<div id="slider-gridSize" style="width:95%;margin-left:3px;"></div>');
			div.append(gridSliderDiv);
			$('#slider-gridSize').slider({
				orientation: "horizontal",
				range: "min",
				min: 5,
				max: 50,
				step: 5,
				value: self.g.gridSize,
				slide: function( event, ui ) {
					self.g.gridSize = ui.value;
					// self.g.onZoom();
				}
			});
			$( "#slider-gridSize" ).slider( "value", self.g.gridSize);
		}
		else if (entity.type == 0){
			var eType = $('<div class="visualist_node_type" style="margin-bottom:5px;">');
			eType.append('<input type="radio" id="visualist_node_type1" name="radio" value="0"/><label for="visualist_node_type1">Icon</label>');
			eType.append('<input type="radio" id="visualist_node_type2" name="radio" value="1"/><label for="visualist_node_type2">Box</label>');
			eType.append('<input type="radio" id="visualist_node_type3" name="radio" value="2"/><label for="visualist_node_type3">Circle</label>');
			div.append(eType);
			if (entity.shape == 0){
				$('#visualist_node_type1').checked = true;
			}
			else if (entity.shape == 1){
				$('#visualist_node_type2').checked = true;
			}
			else if (entity.shape == 2){
				$('#visualist_node_type3').checked = true;
			}
			eType.buttonset();
			eType.find('input').on("click", function() {
				var val = parseInt($(this).attr('value'));
				Interface.entityType = val;
				entity.shape = val;
				entity.create();
				entity.redraw();
			});

			var eSet = $('<div class="visualist_node_set" style="margin-bottom:5px;">');
			eSet.append('<input type="checkbox" id="visualist_node_set" name="radio"/><label for="visualist_node_set">Set</label>');
			div.append(eSet);
			if (entity.set){
				$('#visualist_node_set').checked = true;
			}
			eSet.buttonset();
			eSet.find('input').on("click", function() {
				var val = $(this).attr('checked');
				val == 'checked' ? entity.set = true : entity.set = false;
				entity.create();
				entity.redraw();
				entity.updateConnect();
			});

			var eTheme = $('<div class="visualist_node_theme" style="margin-bottom:5px;">');
			eTheme.append('<input type="checkbox" id="visualist_node_theme" name="radio"/><label for="visualist_node_theme">ThemeLine</label>');
			div.append(eTheme);
			if (entity.theme.draw){
				$('#visualist_node_theme').checked = true;
			}
			eTheme.buttonset();
			eTheme.find('input').on("click", function() {
				var val = $(this).attr('checked');
				val == 'checked' ? entity.theme.draw = true : entity.theme.draw = false;
				entity.create();
				entity.redraw();
			});
		}
	};

	/**
	* Update the History Panel
	*
	*@param {Boolean} force Redraw even if the history is hidden (used on accordion click)
	*@param {String} tab The id of the Graph (used on tab click)
	*/
	Interface.prototype.updateHistory = function(force)
	{
		g = Interface.get().currentGraph;
		if (!g) return;

		if(!$('.visualist-history').is(":visible") && !force){
			return;
		}
		g.hideHelpers();
		var hist = g.history();
		if (hist[1] == 0){$('a[href="#undo"]').button('option','disabled',true);}
		else{$('a[href="#undo"]').button('option','disabled',false);}

		if (hist[1] == hist[0].length-1){$('a[href="#redo"]').button('option','disabled',true);}
		else{$('a[href="#redo"]').button('option','disabled',false);}

		$('.visualist-history').html('');
		for (var id in hist[0]){
			var $step = $('<tr id='+id+'><td>'+hist[0][id].name+'</td></tr>');
			if (id == hist[1]){
				$step.css('font-weight','bold');
			}
			else if (id > hist[1]){
				$step.css('color','grey');
			}
			$step.bind("click", function(e){
				g.stepTo(parseInt($(this).attr('id')));
			});
			$('.visualist-history').prepend($step);
		}
	};

	/**
	* Set SVG width and height on Resize
	*
	*/
	Interface.prototype.onWindowSizeChanged = function()
	{	
		log('Resize Canvas');
		var g = this.currentGraph;
		if (g){
			var size = this.canvasSize();
			if (size[0] <= 0 || size[1] <= 0){return;}
			g.svg.attr('width', size[0]);
			g.svg.attr('height', size[1]);
			var grid = g.svg.select(".grid");
			grid.attr('width', size[0]);
			grid.attr('height', size[1]);
		}
		// if (Interface.resizeTimerID == null) {
		// Interface.resizeTimerID = window.setTimeout(function() {
		// Interface.resizeTimerID = null;
		// Interface.timebar.layout();
		// }, 500);
		// }
	};

	/**
	* Get Size of the Center Panel
	*
	*/
	Interface.prototype.canvasSize = function()
	{	
		var w = $('.ui-layout-center').outerWidth()
			- 12; //TODO: why ? (border)
		var h = $('.ui-layout-center').outerHeight()
			- ($('.ui-tabs-nav').is(':visible') ? $('.ui-tabs-nav').outerHeight() : 0)
			- ($("#visualist_timebar").is(':visible') ? $('.visualist_timebar').outerHeight() : 0)
			- 12; //TODO: why ? (border)
		return [w, h];
	};

	Interface.prototype.createIconSelector = function()
	{
		var iconDiv = $('<table class="visualist_nodeSelector"></table>');
		var line = $('<tr valign="top">');
		iconDiv.append(line);
		$('.ui-layout-west').append(iconDiv);
		var gDiv = $('<td class="toolbar_tool ui-widget"></td>');
		gDiv.append($('<input type="radio" id="group-all" name="radio" value="all"/><label for="group-all">Entity</label>'));
		line.append(gDiv);
		var imgDiv = $('<td class="visualist_nodeSelector_images" style="margin-left:2px;float:right;"><div class"img_group" id="all"></td>');
		line.append(imgDiv);
		for (var i in Interface.icons){
			var group = Interface.icons[i];
			imgDiv.append($('<div class"img_group" id="'+i+'">'));
			$('#'+i).css('display', i == 'person' ? 'block':'none');
			var button = $('<input type="radio" id="group-'+i+'" name="radio" value="'+i+'"/><label for="group-'+i+'">'+i+'</label>');
			gDiv.append(button);
			for (var g in group){
				var name = group[g];
				var $icon = $('<a href="#"><img src="img/'+i+'/'+name+'" style="margin-right:3px;width:32px;border:0;"></a>');
				$('#'+i).append($icon);
				$icon.draggable({
					//	use a helper-clone that is appended to 'body' so is not limited by the pane area
					helper:	function () {
						return $(this).clone().appendTo('body').css('zIndex',5).show();
					},
					cursor:	'move',
					stop: function(event, ui) {
						//SVG Element is not supported by jQuery.droppable > work around
						ui.helper.remove();
						var el = document.elementFromPoint(event.pageX, event.pageY);
						var g = Interface.get().currentGraph;
						var context = g.svg;
						$el = $(el, context);
						if ($el.attr('class') == 'svg-droppable' || $el.attr('class') == 'grid'){
							var c = g.pos(ui.offset.left , ui.offset.top);
							var icon = $(this).find('img').attr('src');
							g.createNode({x:c[0],y:c[1],icon:icon,shape:Interface.entityType
							});
						}
						else if ($el.parents('g').attr('class') == 'nodeEntity'){
							var e = g.get($el.parents('g').attr('id'));
							var data = e.getData();
							data.icon = $(this).find('img').attr('src');
							g.ctrl.addAction(Action.change, {e:e, data:data});
							g.ctrl.run();
						}
					}
				});
			}
		}
		gDiv.buttonsetv();
		gDiv.find('input').on("click", function() {
			var id = $(this).attr('value');
			if (id == 'all'){
				$('.visualist_nodeSelector_images').find('div').show('slide', {}, 100);
			}
			else{
				$('.visualist_nodeSelector_images').find('div:visible').hide('slide', {}, 100, function(){
					if ($('#'+id).is(':hidden')) $('#'+id).show('slide', {}, 100); //toggle('drop')
				});
			}
		});
		gDiv.append('<div ui-widget" style="margin-top: 10px !important;"><select id="e1_element" name="e1_element"><option value="">No icon</option><option>icon-user</option></select></div>');
		$('#e1_element').fontIconPicker();

		gDiv.append('<div ui-widget" style="margin-top: 10px !important;"><input type="checkbox" id="addText" /><label for="addText">Text</label></div>');
		$("#addText").on("click", function() {
			//
		});
		$("#addText").button();

		var rType = $('<div class="ui-widget visualist_linkSelector_type" style="margin-top: 10px !important;">');
		rType.append('<input type="radio" id="visualist_linkSelector_type1" name="radio" value="link" /><label for="visualist_linkSelector_type1">Link</label>');
		rType.append('<input type="radio" id="visualist_linkSelector_type2" name="radio" value="polygon"/><label for="visualist_linkSelector_type2">Polygon</label>');
		rType.append('<input type="radio" id="visualist_linkSelector_type3" name="radio" value="box"/><label for="visualist_linkSelector_type3">Box</label>');
		rType.find('input').on("click", function(e) {
			Interface.addingLink = {};
			Interface.addingLink.type = $(this).attr('value');
			Interface.addingLink.color = "grey";
		});
		gDiv.append(rType);
		rType.buttonsetv();

		gDiv.append('<div ui-widget" style="margin-top: 10px !important;"><input type="checkbox" id="addCorner" /><label for="addCorner">Corner</label></div>');
		$("#addCorner").on("click", function() {
			Interface.addingCorner = true;
		});
		$("#addCorner").checked = false;
		$("#addCorner").button();
	};

	Interface.createRelation = function(event, nodes)
	{
		var g = Interface.get().currentGraph;
		var r = g.createRelation(Interface.addingLink.type, nodes, {color:Interface.addingLink.color});
		if (Interface.addingLink.type == 'link'){
			event.path = r.svg.select(r.source ? '.e'+r.source.id : 'path').node();
			r.eventHandler.creationPopup(event);
		}
		$(".visualist_linkSelector_type").find('input').each(function(){
			$(this).attr('checked', false);
			$(this).button('refresh');
		});
	};

	Interface.UpdateTimebar = function(zones)
	{
		if ($("#visualist_timebar").length == 0 || $("#visualist_timebar").is(':hidden')){
			return;
		}
		var g = Interface.get().currentGraph;
		var source = null;
		if (!g){
			zones = [];
		}
		else{
			if (!zones) zones = g.getDateZones();
			source = g.timeBarEventSource;
		}
		var newband = Timeline.createHotZoneBandInfo({
			zones:			zones,
			theme:			Interface.timeBarTheme,
			width:          Interface.timeBarParams.width,
			intervalUnit:   Interface.timeBarParams.intervalUnit,
			intervalPixels: Interface.timeBarParams.intervalPixels,
			timeZone:       Interface.timeBarParams.timeZone,
			eventSource: 	source
		});
		Interface.timeBarBandInfos[0] = newband;
		Interface.timeBarBandInfos[1].eventSource = source;

		Interface.timebarStart = Interface.timebar.getBand(0)._ether._start;
		Interface.timebarDiv.attr('class', 'visualist_timebar');
		Interface.timebar = Timeline.create(document.getElementById("visualist_timebar"), Interface.timeBarBandInfos);
		Interface.timebar.finishedEventLoading();
		Interface.timebar.getBand(0).setMinVisibleDate(Interface.timebarStart);
		Interface.timebar.getBand(0).addOnScrollListener(function(band) {
			if (!Interface.padding){
				var g = Interface.get().currentGraph;
				var dx = Interface.timebar.getBand(0)._ether.dateToPixelOffset(Interface.timebarStart);
				g.main.node().transform.baseVal.getItem(0).matrix.e += dx;
				Interface.timebarStart = Interface.timebar.getBand(0)._ether._start;
			}
		});
	};

	Timeline.OriginalEventPainter.prototype._showBubble = function(x, y, evt)
	{
		var band = Interface.timebar.getBand(0);
		var events = band._eventPainter._eventIdToElmt;
		var img = $(events[evt._id]).find('img');
		var g = Interface.get().currentGraph;
		var entity = g.get(evt._id);
		var icon = "";
		if (evt._icon == "js/api/timeline_js/images/gray-circle.png"){
			icon = "js/api/timeline_js/images/dull-blue-circle.png";
			entity.ctrlDateTime = 1;
		}
		else if (evt._icon == "js/api/timeline_js/images/dull-blue-circle.png"){
			icon = "js/api/timeline_js/images/dull-green-circle.png";
			entity.ctrlDateTime = 0;
		}
		else if (evt._icon == "js/api/timeline_js/images/dull-green-circle.png"){
			icon = "js/api/timeline_js/images/gray-circle.png";
			entity.ctrlDateTime = 2;
			x = band._ether.dateToPixelOffset(entity.startDateTime);
			if (entity.w) x -= entity.w/2;

			entity.x = (x - g.translateX())/g.scale();
			entity.redraw();
			g.hideSelector();
		}
		evt._icon = icon;
		img.attr('src', icon);
	};
