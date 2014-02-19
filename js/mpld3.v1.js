/* mpld3.js: javascript backend for displaying interactive matplotlib plots */

var mpld3 = {
    version: "0.1"
};


/* Figure object:
    prop contains:
      width  : figure width in points (integer; required)
      height : figure height in points (integer; required)
*/
mpld3.Figure = function(figid, prop){
    this.name = "mpld3.Figure";
    this.figid = figid;
    this.root = d3.select('#' + figid);

    var required = ["width", "height"];
    var defaults = {data:{}, axes:[], toolbar:["reset","move"]};
    prop = mpld3.process_props(this, prop, defaults, required);

    this.width = prop.width;
    this.height = prop.height;
    this.data = prop.data;
    this.toolbar = new mpld3.Toolbar(this, prop.toolbar);

    this.axes = [];
    for(var i=0; i<prop.axes.length; i++){
	this.axes.push(new mpld3.Axes(this, prop.axes[i]));
    }
    this.zoom_on = true;
}

mpld3.Figure.prototype.draw = function(){
    this.canvas = this.root.append('svg:svg')
        .attr('class', 'mpld3-figure')
        .attr('width', this.width)
        .attr('height', this.height);
    this.toolbar.draw();

    for (var i=0; i<this.axes.length; i++){
	this.axes[i].draw();
    }
};

mpld3.Figure.prototype.reset = function(duration){
    duration = (typeof duration !== 'undefined') ? duration : 750;
    for (var i=0; i<this.axes.length; i++){
	this.axes[i].prep_reset();
    }
    
    var transition = function(t){
	for (var i=0; i<this.axes.length; i++){
	    this.axes[i].xdom(this.axes[i].xdom.domain(this.axes[i].ix(t)));
	    this.axes[i].ydom(this.axes[i].ydom.domain(this.axes[i].iy(t)));
	    
	    // don't propagate: this will be done as part of the loop.
	    this.axes[i].zoomed(false);
	}
    }.bind(this)
    
    d3.transition().duration(duration)
        .tween("zoom", function(){return transition;});
    
    for (var i=0; i<this.axes.length; i++){
	this.axes[i].finalize_reset();
    }
};

mpld3.Figure.prototype.enable_zoom = function(){
    for(var i=0; i<this.axes.length; i++){
	this.axes[i].enable_zoom();
    }
    this.zoom_on = true;
};

mpld3.Figure.prototype.disable_zoom = function(){
    for(var i=0; i<this.axes.length; i++){
	this.axes[i].disable_zoom();
    }
    this.zoom_on = false;
};

mpld3.Figure.prototype.toggle_zoom = function(){
    if(this.zoom_on){
	this.disable_zoom();
    }else{
	this.enable_zoom();
    }
};


/* Toolbar Object: */
mpld3.Toolbar = function(fig, prop){
    this.name = "mpld3.Toolbar";
    this.fig = fig;
    this.prop = prop;
};

mpld3.Toolbar.prototype.draw = function(){
    this.toolbar = this.fig.root.append("div").attr("class", "mpld3-toolbar");
    for(var i=0; i<this.prop.length; i++){
	switch(this.prop[i])
	{
	case "reset":
            this.toolbar
		.append("button")
		.attr("class", "mpld3-resetbutton")
		.style("background",
		       "#ffffff url(icons/home.png) no-repeat center")
	        .style("border", "2px outset")
		.style("width", "36px")
		.style("height", "32px")
	        .style("cursor", "hand")
	        .on("mousedown", function(){d3.select(this)
                                            .style("border", "2px inset");})
	        .on("mouseup", function(){d3.select(this)
                                          .style("border", "2px outset");})
		.on("click", this.fig.reset.bind(this.fig));
	    break;
	case "move":
            this.toolbar
		.append("button")
		.attr("class", "mpld3-movebutton")
		.style("background",
		       "#eeeeee url(icons/move.png) no-repeat center")
	        .style("border", "2px inset")
		.style("width", "36px")
		.style("height", "32px")
	        .style("cursor", "hand")
	        .on("mousedown", function(){d3.select(this)
                                            .style("border", "2px inset");})
		.on("click", this.toggle_zoom.bind(this));
	    break;
	default:
	    throw "toolbar '" + this.prop[i] + "' not recognized";
	}
	this.toolbar.append("div")
	    .attr("class", "divider")
	    .style("width", "5px")
	    .style("height", "auto")
	    .style("display", "inline-block");
    }
};

mpld3.Toolbar.prototype.toggle_zoom = function(){
    this.fig.toggle_zoom();
    if(this.fig.zoom_on){
	d3.selectAll(".mpld3-movebutton")
	        .style("border", "2px inset")
		.style("background",
		       "#eeeeee url(icons/move.png) no-repeat center")
    }else{
	d3.selectAll(".mpld3-movebutton")
	        .style("border", "2px outset")
		.style("background",
		       "#ffffff url(icons/move.png) no-repeat center")
    }
};


/* Axes Object: */
mpld3.Axes = function(fig, prop){
    this.name = "mpld3.Axes";
    this.fig = fig;
    this.axnum = fig.axes.length;
    this.axid = fig.figid + '_ax' + (this.axnum + 1)
    this.clipid = this.axid + '_clip'

    var required = ["xlim", "ylim"];
    var defaults = {"bbox": [0.1, 0.1, 0.8, 0.8],
		    "axesbg": "#FFFFFF",
		    "axesbgalpha": 1.0,
		    "xdomain": null,
		    "ydomain": null,
		    "xscale": "linear",
		    "yscale": "linear",
		    "xgridOn": false,
		    "ygridOn": false,
		    "zoomable": true,
		    "axes": [{position:"left"},
			     {position:"bottom"}],
		    "xgridprops": {},
		    "ygridprops": {},
		    "lines": [],
		    "markers": [],
		    "texts": []};
    this.prop = mpld3.process_props(this, prop, defaults, required)
    this.prop.xdomain = this.prop.xdomain || this.prop.xlim;
    this.prop.ydomain = this.prop.ydomain || this.prop.ylim;
    
    this.fig = fig;

    this.sharex = [];
    this.sharey = [];
    this.elements = [];
    
    var bbox = this.prop.bbox;
    this.position = [bbox[0] * this.fig.width,
                     (1 - bbox[1] - bbox[3]) * this.fig.height];
    this.width = bbox[2] * this.fig.width;
    this.height = bbox[3] * this.fig.height;
    
    if(this.prop.xscale === 'log'){
	this.xdom = d3.scale.log();
    }else if(this.prop.xscale === 'date'){
	this.xdom = d3.time.scale();
    }else{
	this.xdom = d3.scale.linear();
    }
    
    if(this.prop.yscale === 'log'){
	this.ydom = d3.scale.log();
    }else if(this.prop.yscale === 'date'){
	this.ydom = d3.time.scale();
    }else{
	this.ydom = d3.scale.linear();
    }
    
    this.xdom.domain(this.prop.xdomain)
        .range([0, this.width]);
    
    this.ydom.domain(this.prop.ydomain)
        .range([this.height, 0]);
    
    if(this.prop.xscale === 'date'){
	this.xmap = d3.time.scale()
            .domain(this.prop.xdomain)
            .range(this.prop.xlim);
	this.x = function(x){return this.xdom(this.xmap.invert(x));}
    }else if(this.prop.xscale === 'log'){
	this.xmap = this.xdom;
	this.x = this.xdom;
    }else{
	this.xmap = this.xdom;
	this.x = this.xdom;
    }
    
    if(this.prop.yscale === 'date'){
	this.ymap = d3.time.scale()
            .domain(this.ydomain)
            .range(this.prop.ylim);
	this.y = function(y){return this.ydom(this.ymap.invert(y));}
    }else if(this.prop.yscale === 'log'){
	this.ymap = this.ydom;
	this.y = this.ydom;
    }else{
	this.ymap = this.ydom;
	this.y = this.ydom;
    }

    var axes = this.prop.axes;
    var lines = this.prop.lines;
    var markers = this.prop.markers;
    var texts = this.prop.texts;

    // Add axes
    for(var i=0; i<axes.length; i++){
	this.elements.push(new mpld3.Axis(this, axes[i]));
    }

    // Add grids
    if(this.prop.xgridOn){
	this.prop.xgridprops.xy = "x";
	this.elements.push(new mpld3.Grid(this, this.prop.xgridprops));
    }
    if(this.prop.ygridOn){
	this.prop.ygridprops.xy = "y";
	this.elements.push(new mpld3.Grid(this, this.prop.ygridprops));
    }

    // Add lines
    for(var i=0; i<lines.length;i++){
	this.elements.push(new mpld3.Line(this, lines[i]));
    }

    // Add markers
    for(var i=0; i<markers.length;i++){
	this.elements.push(new mpld3.Markers(this, markers[i]));
    }

    // Add text
    for(var i=0; i<texts.length; i++){
	this.elements.push(new mpld3.Text(this, texts[i]));
    }
}

mpld3.Axes.prototype.draw = function(){
    this.zoom = d3.behavior.zoom()
        .x(this.xdom)
        .y(this.ydom);
    
    this.baseaxes = this.fig.canvas.append("g")
        .attr('transform', 'translate('
              + this.position[0] + ','
              + this.position[1] + ')')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('class', "baseaxes")
	.style('cursor', 'move');
    
    this.enable_zoom();
    
    this.axesbg = this.baseaxes.append("svg:rect")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("class", "axesbg")
	.style("fill", this.prop.axesbg)
        .style("fill-opacity", this.prop.axesbgalpha);
    
    this.clip = this.baseaxes.append("svg:clipPath")
        .attr("id", this.clipid)
        .append("svg:rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", this.width)
        .attr("height", this.height)
    
    this.axes = this.baseaxes.append("g")
        .attr("class", "axes")
        .attr("clip-path", "url(#" + this.clipid + ")");
    
    for(var i=0; i<this.elements.length; i++){
	this.elements[i].draw();
    }
};

mpld3.Axes.prototype.enable_zoom = function(){
    if(this.prop.zoomable){
	this.zoom.on("zoom", this.zoomed.bind(this));
	this.baseaxes.call(this.zoom);
    }
    this.baseaxes.style("cursor", 'move');
};

mpld3.Axes.prototype.disable_zoom = function(){
    this.zoom.on("zoom", null);
    this.baseaxes.on('.zoom', null)
    this.baseaxes.style('cursor', null);
};

mpld3.Axes.prototype.zoomed = function(propagate){
    // propagate is a boolean specifying whether to propagate movements
    // to shared axes, specified by sharex and sharey.  Default is true.
    propagate = (typeof propagate == 'undefined') ? true : propagate;
    
    //console.log(this.zoom.translate());
    //console.log(this.zoom.scale());
    //console.log(this.zoom.x().domain());
    //console.log(this.zoom.y().domain());
    
    for(var i=0; i<this.elements.length; i++){
	this.elements[i].zoomed();
    }
    
    if(propagate){
	// update shared x axes
	for(var i=0; i<this.sharex.length; i++){
	    this.sharex[i].zoom.x().domain(this.zoom.x().domain());
	    this.sharex[i].zoomed(false);
	}
	// update shared y axes
	for(var i=0; i<this.sharey.length; i++){
	    this.sharey[i].zoom.y().domain(this.zoom.y().domain());
	    this.sharey[i].zoomed(false);
	}
    }
};

mpld3.Axes.prototype.prep_reset = function(){
    // interpolate() does not work on dates, so we map dates to numbers,
    // interpolate the numbers, and then invert the map.
    // we use the same strategy for log, so the interpolation will be smooth.
    // There probably is a cleaner approach...
    
    if (this.prop.xscale === 'date'){
	var start = this.xdom.domain();
	var end = this.xdomain;
	var interp = d3.interpolate(
            [this.xmap(start[0]), this.xmap(start[1])],
            [this.xmap(end[0]), this.xmap(end[1])]);
	this.ix = function(t){
	    return [this.xmap.invert(interp(t)[0]),
		    this.xmap.invert(interp(t)[1])];
	}
    }else{
	this.ix = d3.interpolate(this.xdom.domain(), this.prop.xlim);
    }
    
    if (this.prop.yscale === 'date'){
	var start = this.ydom.domain();
	var end = this.ydomain;
	var interp = d3.interpolate(
            [this.ymap(start[0]), this.ymap(start[1])],
            [this.ymap(end[0]), this.ymap(end[1])]);
	this.iy = function(t){
	    return [this.ymap.invert(interp(t)[0]),
		    this.ymap.invert(interp(t)[1])];
	}
    }else{
	this.iy = d3.interpolate(this.ydom.domain(), this.prop.ylim);
    }
}

mpld3.Axes.prototype.finalize_reset = function(){
    this.zoom.scale(1).translate([0, 0]);
}

mpld3.Axes.prototype.reset = function(){
    this.prep_reset();
    d3.transition().duration(750).tween("zoom", function() {
	return function(t) {
	    this.zoom.x(this.xdom.domain(this.ix(t)))
		.y(this.ydom.domain(this.iy(t)));
	    this.zoomed();
	};
    });
    this.finalize_reset();
};


/* Axis object 

Parameters
----------
   prop.position : "left"|"right"|"top"|"bottom"
       position of the axis
   prop.nticks : integer (optional, default = 10)
       number of major ticks on the axis
   prop.tickvalues : list (optional, default = null)
       if specified, ignore nticks and use these tick values only
   prop.tickformat : string (optional, default = null)
       if specified, use the given string formatter for the tick labels
   prop.stroke : string (optional, default = "black")
       the color of the axis spine and ticks
*/
mpld3.Axis = function(axes, prop){
    this.name = mpld3.Axis;
    this.axes = axes;

    var required = ["position"]
    var defaults = {nticks : 10,
		    tickvalues : null,
		    tickformat : null,
		    fontsize : "11px",
		    fontcolor : "black",
		    axiscolor : "black"}
    this.prop = mpld3.process_props(this, prop, defaults, required);
    
    var position = this.prop.position;
    if (position == "bottom"){
	this.transform = "translate(0," + this.axes.height + ")";
	this.scale = this.axes.xdom;
	this.cssclass = "x axis";
    }else if (position == "top"){
	this.transform = "translate(0,0)"
	this.scale = this.axes.xdom;
	this.cssclass = "x axis";
    }else if (position == "left"){
	this.transform = "translate(0,0)";
	this.scale = this.axes.ydom;
	this.cssclass = "y axis";
    }else{
	this.transform = "translate(" + this.axes.width + ",0)";
	this.scale = this.axes.ydom;
	this.cssclass = "y axis";
    }
}

mpld3.Axis.prototype.draw = function(){
    this.axis = d3.svg.axis()
        .scale(this.scale)
        .orient(this.prop.position)
        .ticks(this.prop.nticks)
        .tickValues(this.prop.tickvalues)
        .tickFormat(this.prop.tickformat);

    this.elem = this.axes.baseaxes.append('g')
        .attr("transform", this.transform)
        .attr("class", this.cssclass)
        .call(this.axis);

    // We create header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid + " .axis line, .axis path",
		     {"shape-rendering":"crispEdges",
		      "stroke":this.prop.axiscolor,
		      "fill":"none"});
    mpld3.insert_css("div#" + this.axes.fig.figid + " .axis text",
		     {"font-family": "sans-serif",
		      "font-size": this.prop.fontsize,
		      "fill": this.prop.fontcolor,
		      "stroke": "none"});
};

mpld3.Axis.prototype.zoomed = function(){
    this.elem.call(this.axis);
};


/* Grid Object */
mpld3.Grid = function(axes, prop){
    this.name = "mpld3.Grid";
    this.axes = axes;

    var required = ["xy"];
    var defaults = {color : "gray",
		    dasharray : "2,2",
		    alpha : "0.5"};
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.cssclass = this.prop.xy + "grid";
    
    if(this.prop.xy == "x"){
	this.transform = "translate(0," + this.axes.height + ")";
	this.position = "bottom";
	this.scale = this.axes.xdom;
	this.tickSize = -this.axes.height;
    }else if(this.prop.xy == "y"){
	this.transform = "translate(0,0)";
	this.position = "left";
	this.scale = this.axes.ydom;
	this.tickSize = -this.axes.width;
    }else{
	throw "unrecognized grid xy specifier: should be 'x' or 'y'";
    }
}

mpld3.Grid.prototype.draw = function(){
    this.grid = d3.svg.axis()
        .scale(this.scale)
        .orient(this.position)
        .tickSize(this.tickSize, 0, 0)
        .tickFormat("");
    this.elem = this.axes.axes.append("g")
        .attr("class", this.cssclass)
        .attr("transform", this.transform)
        .call(this.grid);

    // We create header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid +
		     " ." + this.cssclass + " .tick",
		     {"stroke": this.prop.color,
		      "stroke-dasharray": this.prop.dasharray,
		      "stroke-opacity": this.prop.alpha});
    mpld3.insert_css("div#" + this.axes.fig.figid +
		     " ." + this.cssclass + " path", +
		     {"stroke-width": 0});
};

mpld3.Grid.prototype.zoomed = function(){
    this.elem.call(this.grid);
};


/* Line Element */
mpld3.Line = function(ax, prop){
    this.name = "mpld3.Line";
    this.ax = ax;

    var required = ["data"]
    var defaults = {xindex: 0,
		    yindex: 1,
		    color: "salmon",
		    linewidth: 2,
		    dasharray: "10,0",
		    fill: "none",
		    alpha: 1.0};
    
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.data = ax.fig.data[this.prop.data];
};

mpld3.Line.prototype.draw = function(){
    // TODO: style stuff here
    this.line = d3.svg.line()
        .x(function(d) {return this.ax.x(d[this.prop.xindex]);})
        .y(function(d) {return this.ax.y(d[this.prop.yindex]);})
        .interpolate("linear")
        .defined(function (d) {return !isNaN(d[0]) && !isNaN(d[1]); });

    this.lineobj = this.ax.axes.append("svg:path")
        .attr("d", this.line(this.data))
        .attr('class', this.prop.lineid)
	.style("stroke", this.prop.color)
	.style("stroke-width", this.prop.linewidth)
	.style("stroke-dasharray", this.prop.dasharray)
	.style("fill", this.prop.fill)
	.style("stroke-opacity", this.prop.alpha);
}

mpld3.Line.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.lineobj.attr("d", this.line(this.data));
}


/* Markers Element */
mpld3.Markers = function(ax, prop){
    this.name = "mpld3.Markers";
    this.ax = ax;
    this.id = Math.floor(Math.random() * 1E12);
    
    var required = ["data"];
    var defaults = {xindex: 0,
		    yindex: 1,
		    facecolor: "salmon",
		    edgecolor: "black",
		    edgewidth: 1,
		    alpha: 1.0,
		    markersize: 6,
		    markername: "circle",
		    markerpath: null};
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.data = ax.fig.data[this.prop.data];

    if(this.prop.markerpath !== null){
	this.marker = construct_SVG_path(this.prop.markerpath);
    }else{
	this.marker = d3.svg.symbol(this.prop.markername)
	                           .size(Math.pow(this.prop.markersize, 2));
    }
};

mpld3.Markers.prototype.translate = function(d){
    return "translate("
      + this.ax.x(d[this.prop.xindex]) + ","
      + this.ax.y(d[this.prop.yindex]) + ")";
};

mpld3.Markers.prototype.draw = function(){
    this.pointsobj = this.ax.axes.append("svg:g")
        .selectAll("scatter-dots-" + this.id)
        .data(this.data.filter(
            function(d){return !isNaN(d[0]) && !isNaN(d[1]); }))
        .enter().append("svg:path")
          .attr('class', 'points' + this.id)
          .attr("d", this.marker)
          .attr("transform", this.translate.bind(this))
          .style("stroke-width", this.prop.edgewidth)
          .style("stroke", this.prop.edgecolor)
          .style("fill", this.prop.facecolor)
          .style("fill-opacity", this.prop.alpha)
          .style("stroke-opacity", this.prop.alpha);
}

mpld3.Markers.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.pointsobj.attr("transform", this.translate.bind(this));
}

/* Text Element */
mpld3.Text = function(ax, prop){
    this.ax = ax;
    this.prop = mpld3.process_props(this, prop,
				    {coordinates: "data",
				     h_anchor: "start",
				     v_baseline: "auto",
				     rotation: 0,
				     fontsize: 11,
				     color: "black",
				     alpha: 1.0},
				    ["text", "position"]);
    this.text = this.prop.text;
    this.position = this.prop.position;
}

mpld3.Text.prototype.draw = function(){
    var pos_x, pos_y;
    if(this.prop.coordinates == "data"){
	pos_x = this.ax.x(this.position[0]);
	pos_y = this.ax.x(this.position[0]);
    }else{
	pos_x = this.position[0];
	pos_y = this.ax.fig.height - this.position[1];
    }

    this.obj = this.ax.axes.append("text")
        .attr("x", pos_x)
        .attr("y", pos_y);

    if(this.prop.rotation){
	this.obj.attr("transform", "rotate(" + this.rotation + ","
                      + pos_x + "," + pos_y + ")");
    }

    this.obj.attr("class", "text")
        .text(this.text)
        .style("text-anchor", this.prop.h_anchor)
	.style("dominant-baseline", this.prop.v_baseline)
	.style("font-size", this.prop.fontsize)
	.style("fill", this.prop.color)
	.style("opacity", this.prop.alpha);
}

mpld3.Text.prototype.zoomed = function(){
    if(this.prop.coordinates == "data"){
	pos_x = this.ax.x(this.position[0]);
	pos_y = this.ax.y(this.position[1]);

	this.obj.attr("x", pos_x)
            .attr("y", pos_y);

	if(this.prop.rotation){
	    this.obj.attr("transform", "rotate(" + this.rotation + ","
			  + pos_x + "," + pos_y + ")");
	}
    }
}


/**********************************************************************/
/* Data Parsing Functions */
mpld3.draw_figure = function(figid, spec){
    var element = document.getElementById(figid);
    if(element === null){
	throw (figid + " is not a valid id");
	return null;
    }
    var fig = new mpld3.Figure(figid, spec);
    fig.draw();
    return fig;
};


/**********************************************************************/
/* Convenience Functions                                              */

mpld3.process_props = function(obj, properties, defaults, required){
    if(typeof(defaults) === "undefined"){defaults = {};}
    if(typeof(required) === "undefined"){required = [];}

    for(i=0; i<required.length; i++){
	if(!(required[i] in properties)){
	    throw ("property '" + required[i] + "' " +
		   "must be specified for " + obj.name);
	}
    }
    for(var property in defaults){
	if(!(property in properties)){
	    properties[property] = defaults[property];
	}
    }
    return properties;
}

// Function to insert some CSS into the header
mpld3.insert_css = function(selector, attributes){
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');

    var css = selector + " {"
    for(var prop in attributes){
	css += prop + ":" + attributes[prop] + "; "
    }
    css += "}"

    style.type = 'text/css';
    if (style.styleSheet){
	style.styleSheet.cssText = css;
    } else {
	style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
};

// This function constructs a mapped SVG path
// from an input data array
mpld3.construct_SVG_path = function(data, xmap, ymap){
    xmap = (typeof xmap !== 'undefined') ? xmap : function(x){return x;};
    ymap = (typeof ymap !== 'undefined') ? ymap : function(y){return y;};
    var result = "";
    for (var i=0;i<data.length;i++){
	result += data[i][0];
	if(data[i][0] == 'Z'){
            continue;
	}
	for (var j=0;j<data[i][1].length;j++){
            if(j % 2 == 0){
		result += " " + xmap(data[i][1][j]);
            }else{
		result += " " + ymap(data[i][1][j]);
            }
	}
	result += " ";
    }
    return result;
};
