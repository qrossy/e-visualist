Label.prototype.toString = function() {
  var ret = "Label";
  return ret;
};

function Label(params) {
  if (!params) params = {};
  this.e = params.e ? params.e : new Entity();
  this.x = params.x ? params.x : null;
  this.y = params.y ? params.y : null;
  this.pos = params.pos ? params.pos : '8';
  this.linkPath = params.linkPath ? params.linkPath : null;
  this.ratio = params.ratio ? params.ratio : 0.5;
  this.text = params.text ? params.text : 'Label';
  this.font = params.font ? params.font : '10px Arial';
  this.fontColor = params.fontColor ? params.fontColor : 'grey';
  this.html = null;
  this.textWidth = params.textWidth ? params.textWidth : 35;
  this.fixedWidth = params.fixedWidth ? params.fixedWidth : false;
  delete params;

  this.getData = function() {
    return {
      e: this.e.id, // Reference to connected Entity
      x: this.x, // xPos on Graph
      y: this.y, // yPos on Graph
      pos: this.pos, // Node anchor (String from '1' to '9')
      linkPath: this.linkPath, // Link Path
      ratio: this.ratio, // Link anchor (Float 0 to 1)
      text: this.e.g.isSVG ? this.getHtml() : this.text, // Text
      html: this.html,
      textWidth: this.textWidth, // Width of the Text Area
      fixedWidth: this.fixedWidth, // Boolean
    };
  };

  this.setData = function(data) {
    for (var id in data) {
      this[id] = data[id];
    }
  };

  this.updateConnect = function() {};
}

Label.prototype.redraw = function() {
  if (this.e.g.isCanvas) {
    var ctx = this.e.g.context;
    this.textWidth = ctx.measureText(this.text).width;
    this.textHeight = Label.getTextHeight(this.font).height;
    this.setPos();
    if (this.html){ //TODO : make it works and handle svg size correctly !
      var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + 
        this.textWidth +'" height="'+ this.textHeight +'">' +
         '<foreignObject width="100%" height="100%">' +
            this.html
         '</foreignObject>' +
      '</svg>';
      var svg = new Blob([data], {type: 'image/svg+xml'});
      var DOMURL = window.URL || window.webkitURL || window;
      var url = DOMURL.createObjectURL(svg);
      //log(svg);
      //log(url);
      var imglabel = new Image();
      imglabel.src = url;
      ctx.drawImage(imglabel, this.e.x + this.x, this.e.y + this.y);
      DOMURL.revokeObjectURL(url);
    } else {
      //TODO Handle label fonts, size, etc...
      ctx.font = this.font;
      // ctx.textAlign = 'center';
      ctx.fillStyle = this.fontColor;
      ctx.fillText(this.text, this.e.x + this.x, this.e.y + this.y + this.textHeight);
    }
  } else if (this.e.g.isSVG) {
    this.textHeight = $(this.svg.select('div').node())[0].clientHeight;
    if (this.e.type == 0) {
      this.setPos();
    } else if (this.e.type == 1) {
      var tot = this.linkPath.getTotalLength();
      var pos = this.linkPath.getPointAtLength(this.ratio * tot);
      this.x = pos.x - this.textWidth / 2;
      this.y = pos.y - this.textHeight / 2;
    } else {
      this.x = this.e.x - this.textWidth / 2;
      this.y = this.e.y - this.textHeight / 2;
    }
    this.svg
      .attr("x", this.x)
      .attr("y", this.y)
      .attr("width", this.textWidth)
      .attr("height", this.textHeight);
  }
};

Label.prototype.create = function() {
  if (this.e.g.isCanvas) {} else if (this.e.g.isSVG) {
    this.svg = this.e.svg.append("svg:foreignObject");
    this.svg
      .attr("class", "label");
    if (this.e.type == 1 && !this.linkPath) {
      this.linkPath = this.e.svg.select(this.e.connectCount() == 2 ? '.e' + this.e.source.id : 'path').node();
    }

    $(this.svg.node()).append('<div><p style="text-align: center; margin: 0px;"><span style="text-align: center;"' +
      (this.e.type == 1 ? 'style="background-color:#ffffff;"' : '') +
      '>' + this.text + '</span></p></div>');

    var self = this;
    var onDblClick = function() {
      d3.event.stopPropagation();
      self.textPopup(d3.event);
    };
    var onMouseDown = function() {
      d3.event.stopPropagation();
      self.move = d3.event.altKey ? true : false;
      self.prevPos = {
        x: d3.event.pageX,
        y: d3.event.pageY
      };
      self.e.g.hideHelpers();
    };
    var onMouseMove = function() {
      //d3.event.stopPropagation();
      if (self.move) {
        var pos = {
          x: d3.event.pageX,
          y: d3.event.pageY
        };
        var v = Link.vector(self.prevPos, pos);
      }
    };
    var onMouseUp = function() {
      d3.event.stopPropagation();
      self.move = false;
      self.e.selector.update();
      if (d3.event.which == 3) {
        if (self.e.type == 1) {
          d3.event.path = self.linkPath;
        }
        self.e.eventHandler.creationPopup(d3.event);
      } else if (Interface.addingLink) {
        if (self.e != Interface.addingLink.from) {
          Interface.createRelation(d3.event, [Interface.addingLink.from, self.e]);
        }
        Interface.addingLink = false;
        self.e.g.svg.select(".tempLink").remove();
        document.body.style.cursor = 'default';
      }
    };

    this.svg.on('dblclick', onDblClick);
    this.svg.on('mousedown', onMouseDown);
    this.svg.on('mousemove', onMouseMove);
    this.svg.on('mouseup', onMouseUp);
    this.svg.on('contextmenu', function() {
      d3.event.preventDefault();
    });
  }
  this.redraw();
};

Label.prototype.bBox = function() {
  if (this.e.g.renderer == 'canvas'){
    var ctx = this.e.g.context;
    this.textWidth = ctx.measureText(this.text).width;
    this.textHeight = Label.getTextHeight(this.font).height;
    return {
      x: this.e.x + this.x,
      y: this.e.y + this.y,
      width: this.textWidth,
      height: this.textHeight
    };
  } else {
    return {
      x:(this.e.x + this.x),
      y:(this.e.y + this.y),
      width:this.textWidth,
      height:this.h
    };
  }
};

// Determine if a point is inside the shape's bounds
Label.prototype.contains = function(mx, my) {
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  return (this.e.x + this.x <= mx) && (this.e.x + this.x + this.textWidth >= mx) &&
    (this.e.y + this.y <= my) && (this.e.y + this.y + this.textHeight >= my);
};

Label.prototype.getHtml = function() {
  return this.html
};

Label.prototype.setHtml = function(html) {
  this.html = html
};

Label.prototype.setPos = function() {
  switch (this.pos) {
    case '1':
      this.x = -this.textWidth;
      this.y = -this.textHeight;
      break;
    case '2':
      this.x = this.e.w / 2 - this.textWidth / 2;
      this.y = -this.textHeight;
      break;
    case '3':
      this.x = this.e.w;
      this.y = -this.textHeight;
      break;
    case '4':
      this.x = -this.textWidth;
      this.y = this.e.h / 2 - this.textHeight / 2;
      break;
    case '5':
      this.x = this.e.w / 2 - this.textWidth / 2;
      this.y = this.e.h / 2 - this.textHeight / 2;
      break;
    case '6':
      this.x = this.e.w;
      this.y = this.e.h / 2 - this.textHeight / 2;
      break;
    case '7':
      this.x = -this.textWidth;
      this.y = this.e.h;
      break;
    case '8':
      this.x = this.e.w / 2 - this.textWidth / 2;
      this.y = this.e.h;
      break;
    case '9':
      this.x = this.e.w;
      this.y = this.e.h;
      break;
    default:
      this.x = this.e.w / 2 - this.textWidth / 2;
      this.y = this.e.h;
      break;
  }
};

Label.prototype.textPopup = function(event)
{
	this.oldLabel = this.getHtml();
	var div = Interface.get().popupDiv;
	$(div)
	.css("left", event.pageX )
	.css("top", (event.pageY) > 0 ? (event.pageY) : 0)
	.css("padding", "0px 0px 0px 0px")
	.css("border", "0px")
	.css("z-index", 3000)
	.css("position", "relative")
	.css("width", 650)
	.html("");

	$(div).append('<div id="visualist_popup_pos" style="position:absolute;left:-70px;border: 2px solid #eee;border-right-width: 0px;border-radius: 10px;">');
	var self = this;
	var svg = d3.select("#visualist_popup_pos")
	.append("svg:svg")
	.attr("width", 70)
	.attr("height", 200);
	if (this.e.type == 0)
	{
		svg.append("svg:text")
		.attr("x", 15)
		.attr("y", 10)
		.text("Position");
		var size = 15;
		var margin = 3;
		for (var i = 1; i < 10; i++){
			var x = i%3;
			x == 0 ? x = 3 : x = x;
			var y = Math.floor(i/3);
			i%3 != 0 ? y += 1: y = y;
			svg.append("svg:rect")
			.attr("id", i)
			.attr("fill", "black")
			.attr("fill-opacity", this.pos == i ? 0.9 : 0)
			.attr("stroke", "black")
			.attr("stroke-width", this.pos == i ? 0 : 0.5)
			.attr("stroke-dasharray", '1,1')
			.attr("x", -10 + (size+margin)*x)
			.attr("y", (size+margin)*y)
			.attr("width", size)
			.attr("height", size)
			.on('mousedown', function(d){
				svg.selectAll('rect').each(function() {$(this).attr("fill-opacity", 0).attr("stroke-width", 0.5);});
				$(this).attr("fill-opacity", 0.7).attr("stroke-width", 0);
				self.pos = $(this).attr("id");
				self.redraw();
				self.e.updateConnect();
				Interface.modifiedLabel = self;
			});
		}
	}
	else if (this.e.type == 1)
	{
	}
	svg.append("svg:text")
	.attr("x", 10)
	.attr("y", 85)
	.text("Text Width");
	var widthSvg = svg.append("svg:foreignObject")
	.attr("x", 25)
	.attr("y", 90)
	.attr("width", 50)
	.attr("height", 80);
	var wDiv = $('<div class="visualist_textwidthSelector">');
	wDiv.append('<div class="vslider" id="slider-vertical" style="height:50px;margin-left: 6px;"></div>');
	wDiv.append('<input type="text" id="label-width" style="width:40px;"/>');
	$(widthSvg.node()).append(wDiv);
	$("#slider-vertical").slider({
		orientation: "vertical",
		range: "min",
		min: 10,
		max: 300,
		value: self.textWidth,
		slide: function( event, ui ) {
			$( "#label-width" ).val( ui.value );
			self.textWidth = ui.value;
			if (self.e.type == 0){
				self.x = self.e.w/2 - self.textWidth/2;
			}
			else{
				self.x = self.e.x - self.textWidth/2;
			}
			self.redraw();
			self.e.updateConnect();
			Interface.modifiedLabel = self;
		}
	});
	$( "#label-width" ).val( $( "#slider-vertical" ).slider( "value" ));

	svg.append("svg:text")
	.attr("x", 10)
	.attr("y", 170)
	.text("Fixed");
	svg.append("svg:rect")
	.attr("id", "fixedWidth")
	.attr("fill", "black")
	.attr("fill-opacity", this.fixedWidth ? 0.7 : 0)
	.attr("stroke", "black")
	.attr("stroke-width", this.fixedWidth ? 0 : 0.5)
	.attr("stroke-dasharray", '1,1')
	.attr("x", 45)
	.attr("y", 162)
	.attr("width", 10)
	.attr("height", 10)
	.on('mousedown', function(d){
		self.fixedWidth ? $(this).attr("fill-opacity", 0).attr("stroke-width", 0.5) : $(this).attr("fill-opacity", 0.7).attr("stroke-width", 0);
		self.fixedWidth = self.fixedWidth ? false : true;
		self.redraw();
		self.e.updateConnect();
		Interface.modifiedLabel = self;
	});

	var txt = $(this.svg.select('div').node()).html();
	div.append('<textarea class="tinymce" name="content">'+txt+'</textarea>');

	var onChangeContent = function()
	{
		tinyMCE.baseURL = "api/tinymce";
		var txt = tinyMCE.activeEditor.getContent();
		if (txt == ''){
			var empty = '<p style="text-align: center; margin: 0px;"><span style="text-align: center;"'+
			(self.e.type == 1 ? 'style="background-color:#ffffff;"' : '')+'><br /></span></p>';
			tinyMCE.activeEditor.setContent(empty);
			txt = empty;
		}
		if (!self.fixedWidth){
			var max = 0;
			$(tinyMCE.activeEditor.getBody()).find('span').each(function(){
				var w = $(this).width();
				w > max ? max = w : false;
			});
			self.textWidth = parseInt(max*1.2);
			$( "#label-width" ).val(self.textWidth);
			$( "#slider-vertical" ).slider( "value", self.textWidth);
		}
		self.setHtml(txt);
		$(self.svg.select('div').node()).find('p').css('margin', '0px');
		self.redraw();
		self.e.updateConnect();
		Interface.modifiedLabel = self;
	}

	$('textarea.tinymce').tinymce({
		// Location of TinyMCE script
		script_url : 'api/tinymce/tinymce.min.js',

		// General options
		selector: "textarea",
		height: "207",
		toolbar1: "fontfamily fontsize forecolor backcolor | bold italic underline strikethrough subscript superscript",
		toolbar2: "alignleft aligncenter alignright alignjustify | cut copy paste | undo redo removeformat",
		menubar: false,
		toolbar_items_size: 'small',
		onchange_callback : onChangeContent,
		setup : function(ed) {
			ed.on('change', onChangeContent);
			ed.on('keydown', onChangeContent);
		},
	});

	$(div).show();
}

Label.getTextHeight = function(font) {
  var result = {};
  var text = $('<span>Hg</span>').css({
    fontFamily: font
  });
  var block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');
  var div = $('<div></div>');
  div.append(text, block);
  var body = $('body');
  body.append(div);
  try {
    block.css({
      verticalAlign: 'baseline'
    });
    result.ascent = block.offset().top - text.offset().top;
    block.css({
      verticalAlign: 'bottom'
    });
    result.height = block.offset().top - text.offset().top;
    result.descent = result.height - result.ascent;
  } finally {
    div.remove();
  }
  return result;
};
