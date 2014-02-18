/* mpld3.js: javascript backend for displaying interactive matplotlib plots */

var mpld3 = {
    version: "0.1"
};


/* Figure object:
    figspec contains:
      width  : figure width in points (integer; required)
      height : figure height in points (integer; required)
*/
mpld3.Figure = function(figid, figspec){
    this.figid = figid;
    this.root = d3.select("#" + figid);
    this.width = figspec.width;
    this.height = figspec.height;
    this.data = mpld3.get_default(figspec, "data", {});

    this.axes = [];
    for(var i=0; i<figspec.axes.length; i++){
	this.axes.push(new mpld3.Axes(this, figspec.axes[i]));
    }
}

mpld3.Figure.prototype.draw = function(){
    this.canvas = this.root.append('svg:svg')
        .attr('class', 'mpld3-figure')
        .attr('width', this.width)
        .attr('height', this.height);
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


/* Axes Object: */
mpld3.Axes = function(fig, axspec){
    this.axnum = fig.axes.length;
    this.axid = fig.figid + '_ax' + (this.axnum + 1)
    
    this.fig = fig;
    this.xlim = axspec.xlim;
    this.ylim = axspec.ylim;
    this.bbox = mpld3.get_default(axspec, "bbox", [0.1, 0.1, 0.8, 0.8]);
    this.axesbg = mpld3.get_default(axspec, "axesbg", "#FFFFFF");
    this.xdomain = mpld3.get_default(axspec, "xdomain", this.xlim);
    this.ydomain = mpld3.get_default(axspec, "ydomain", this.ylim);
    this.xscale = mpld3.get_default(axspec, "xscale", "linear");
    this.yscale = mpld3.get_default(axspec, "yscale", "linear");
    this.xgridOn = mpld3.get_default(axspec, "xgridOn", false);
    this.ygridOn = mpld3.get_default(axspec, "ygridOn", false);
    this.axclass = mpld3.get_default(axspec, "axclass", "axes");
    this.clipid = mpld3.get_default(axspec, "clipid", this.axid + "clip");
    this.zoomable = mpld3.get_default(axspec, "zoomable", true);
    axes = mpld3.get_default(axspec, "axes", [{position:"left"},
					      {position:"bottom"}]);
    xgridprops = mpld3.get_default(axspec, "xgridprops", {});
    ygridprops = mpld3.get_default(axspec, "ygridprops", {});
    lines = mpld3.get_default(axspec, "lines", []);
    markers = mpld3.get_default(axspec, "markers", []);

    this.sharex = [];
    this.sharey = [];
    this.elements = [];
    
    this.position = [this.bbox[0] * this.fig.width,
                     (1 - this.bbox[1] - this.bbox[3]) * this.fig.height];
    this.width = this.bbox[2] * this.fig.width;
    this.height = this.bbox[3] * this.fig.height;
    
    if(this.xscale === 'log'){
	this.xdom = d3.scale.log();
    }else if(this.xscale === 'date'){
	this.xdom = d3.time.scale();
    }else{
	this.xdom = d3.scale.linear();
    }
    
    if(this.yscale === 'log'){
	this.ydom = d3.scale.log();
    }else if(this.yscale === 'date'){
	this.ydom = d3.time.scale();
    }else{
	this.ydom = d3.scale.linear();
    }
    
    this.xdom.domain(this.xdomain)
        .range([0, this.width]);
    
    this.ydom.domain(this.ydomain)
        .range([this.height, 0]);
    
    if(this.xscale === 'date'){
	this.xmap = d3.time.scale()
            .domain(this.xdomain)
            .range(this.xlim);
	this.x = function(x){return this.xdom(this.xmap.invert(x));}
    }else if(this.xscale === 'log'){
	this.xmap = this.xdom;
	this.x = this.xdom;
    }else{
	this.xmap = this.xdom;
	this.x = this.xdom;
    }
    
    if(this.yscale === 'date'){
	this.ymap = d3.time.scale()
            .domain(this.ydomain)
            .range(this.ylim);
	this.y = function(y){return this.ydom(this.ymap.invert(y));}
    }else if(this.xscale === 'log'){
	this.ymap = this.ydom;
	this.y = this.ydom;
    }else{
	this.ymap = this.ydom;
	this.y = this.ydom;
    }

    // Add axes
    for(var i=0; i<axes.length; i++){
	this.elements.push(new mpld3.Axis(this, axes[i]));
    }

    // Add grids
    if(this.xgridOn){
	xgridprops.xy = "x";
	this.elements.push(new mpld3.Grid(this, xgridprops));
    }
    if(this.ygridOn){
	ygridprops.xy = "y";
	this.elements.push(new mpld3.Grid(this, ygridprops));
    }

    // Add lines
    for(var i=0; i<lines.length;i++){
	this.elements.push(new mpld3.Line(this, lines[i]));
    }

    // Add markers
    for(var i=0; i<markers.length;i++){
	this.elements.push(new mpld3.Markers(this, markers[i]));
    }
}

mpld3.Axes.prototype.draw = function(){
    this.zoom = d3.behavior.zoom()
        .x(this.xdom)
        .y(this.ydom)
        .on("zoom", this.zoomed.bind(this));
    
    this.baseaxes = this.fig.canvas.append("g")
        .attr('transform', 'translate('
              + this.position[0] + ','
              + this.position[1] + ')')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('class', "baseaxes");
    
    if(this.zoomable){
	this.baseaxes.call(this.zoom);
    }
    
    this.axesbg = this.baseaxes.append("svg:rect")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("class", "axesbg")
	.attr("style", "fill:" + this.axesbg + ";");
    
    this.clip = this.baseaxes.append("svg:clipPath")
        .attr("id", this.clipid)
        .append("svg:rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", this.width)
        .attr("height", this.height)
    
    this.axes = this.baseaxes.append("g")
        .attr("class", this.axclass)
        .attr("clip-path", "url(#" + this.clipid + ")");
    
    for(var i=0; i<this.elements.length; i++){
	this.elements[i].draw();
    }
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
    
    if (this.xscale === 'date'){
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
	this.ix = d3.interpolate(this.xdom.domain(), this.xlim);
    }
    
    if (this.yscale === 'date'){
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
	this.iy = d3.interpolate(this.ydom.domain(), this.ylim);
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
   axspec.position : "left"|"right"|"top"|"bottom"
       position of the axis
   axspec.nticks : integer (optional, default = 10)
       number of major ticks on the axis
   axspec.tickvalues : list (optional, default = null)
       if specified, ignore nticks and use these tick values only
   axspec.tickformat : string (optional, default = null)
       if specified, use the given string formatter for the tick labels
   axspec.stroke : string (optional, default = "black")
       the color of the axis spine and ticks
*/
mpld3.Axis = function(axes, axspec){
    this.axes = axes;
    this.position = axspec.position;
    this.nticks = ("nticks" in axspec) ? axspec.nticks : 10;
    this.tickvalues = ("tickvalues" in axspec) ? axspec.tickvalues : null;
    this.tickformat = ("tickformat" in axspec) ? axspec.tickformat : null;
    this.fontsize = ("fontsize" in axspec) ? axspec.fontsize : "11px";
    this.fontcolor = ("fontcolor" in axspec) ? axspec.fontcolor : "black";
    this.axiscolor = ("axiscolor" in axspec) ? axspec.axiscolor : "black";

    if (this.position == "bottom"){
	this.transform = "translate(0," + this.axes.height + ")";
	this.scale = this.axes.xdom;
	this.class = "x axis";
    }else if (this.position == "top"){
	this.transform = "translate(0,0)"
	this.scale = this.axes.xdom;
	this.class = "x axis";
    }else if (this.position == "left"){
	this.transform = "translate(0,0)";
	this.scale = this.axes.ydom;
	this.class = "y axis";
    }else{
	this.transform = "translate(" + this.axes.width + ",0)";
	this.scale = this.axes.ydom;
	this.class = "y axis";
    }
}

mpld3.Axis.prototype.draw = function(){
    this.axis = d3.svg.axis()
        .scale(this.scale)
        .orient(this.position)
        .ticks(this.nticks)
        .tickValues(this.tickvalues)
        .tickFormat(this.tickformat);

    this.elem = this.axes.baseaxes.append('g')
        .attr("transform", this.transform)
        .attr("class", this.class)
        .call(this.axis);

    // We create header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid + " .axis line, .axis path",
		     {"shape-rendering":"crispEdges",
		      "stroke":this.axiscolor,
		      "fill":"none"});
    mpld3.insert_css("div#" + this.axes.fig.figid + " .axis text",
		     {"font-family": "sans-serif",
		      "font-size": this.fontsize,
		      "fill": this.fontcolor,
		      "stroke": "none"});
};

mpld3.Axis.prototype.zoomed = function(){
    this.elem.call(this.axis);
};


/* Grid Object */
mpld3.Grid = function(axes, gridspec){
    this.axes = axes;
    this.color = ("color" in gridspec) ? gridspec.color : "gray";
    this.dasharray = ("dasharray" in gridspec) ? gridspec.dasharray : "2,2";
    this.alpha = ("alpha" in gridspec) ? gridspec.alpha : "0.5";
    this.class = gridspec.xy + "grid";
    
    if(gridspec.xy == "x"){
	this.transform = "translate(0," + this.axes.height + ")";
	this.position = "bottom";
	this.scale = this.axes.xdom;
	this.tickSize = -this.axes.height;
    }else if(gridspec.xy == "y"){
	this.transform = "translate(0,0)";
	this.position = "left";
	this.scale = this.axes.ydom;
	this.tickSize = -this.axes.width;
    }else{
	throw "unrecognized grid specifier: should be 'x' or 'y'";
    }
}

mpld3.Grid.prototype.draw = function(){
    this.grid = d3.svg.axis()
        .scale(this.scale)
        .orient(this.position)
        .tickSize(this.tickSize, 0, 0)
        .tickFormat("");
    this.elem = this.axes.axes.append("g")
        .attr("class", this.class)
        .attr("transform", this.transform)
        .call(this.grid);

    // We create header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid +
		     " ." + this.class + " .tick",
		     {"stroke": this.color,
		      "stroke-dasharray": this.dasharray,
		      "stroke-opacity": this.alpha});
    mpld3.insert_css("div#" + this.axes.fig.figid +
		     " ." + this.class + " path", +
		     {"stroke-width": 0});
};

mpld3.Grid.prototype.zoomed = function(){
    this.elem.call(this.grid);
};


/* Line Element */
mpld3.Line = function(ax, linespec){
    this.ax = ax
    this.data = ax.fig.data[linespec.data];
    this.x_index = mpld3.get_default(linespec, "x_index", 0);
    this.y_index = mpld3.get_default(linespec, "y_index", 1);
    this.color = mpld3.get_default(linespec, "color", "salmon");
    this.linewidth = mpld3.get_default(linespec, "linewidth", 2);
    this.dasharray = mpld3.get_default(linespec, "dasharray", "10,0");
    this.fill = mpld3.get_default(linespec, "fill", "none");
    this.alpha = mpld3.get_default(linespec, "alpha", 1.0);
};

mpld3.Line.prototype.draw = function(){
    // TODO: style stuff here
    this.line = d3.svg.line()
        .x(function(d) {return this.ax.x(d[this.x_index]);})
        .y(function(d) {return this.ax.y(d[this.y_index]);})
        .interpolate("linear")
        .defined(function (d) {return !isNaN(d[0]) && !isNaN(d[1]); });

    this.lineobj = this.ax.axes.append("svg:path")
        .attr("d", this.line(this.data))
        .attr('class', this.lineid)
	.style("stroke", this.color)
	.style("stroke-width", this.linewidth)
	.style("stroke-dasharray", this.dasharray)
	.style("fill", this.fill)
	.style("stroke-opacity", this.alpha);
}

mpld3.Line.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.lineobj.attr("d", this.line(this.data));
}


/* Markers Element */
mpld3.Markers = function(ax, markerspec){
    this.ax = ax;
    this.data = ax.fig.data[markerspec.data];
    this.x_index = mpld3.get_default(markerspec, "x_index", 0);
    this.y_index = mpld3.get_default(markerspec, "y_index", 1);
    this.facecolor = mpld3.get_default(markerspec, "facecolor", "salmon");
    this.edgecolor = mpld3.get_default(markerspec, "edgecolor", "black");
    this.edgewidth = mpld3.get_default(markerspec, "edgewidth", 1);
    this.alpha = mpld3.get_default(markerspec, "alpha", 1.0);

    this.markername = mpld3.get_default(markerspec, "markername", "circle");
    this.markerpath = mpld3.get_default(markerspec, "markerpath", null);

    this.marker = d3.svg.symbol(this.markername);
    //this.marker = construct_SVG_path(this.markerpath);
};

mpld3.Markers.prototype.translate = function(d){
    { return "translate("
      + this.ax.x(d[this.x_index]) + ","
      + this.ax.y(d[this.y_index]) + ")"; };
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
        .style("stroke-width", this.edgewidth)
        .style("stroke", this.edgecolor)
        .style("fill", this.facecolor)
        .style("fill-opacity", this.alpha)
        .style("stroke-opacity", this.alpha);
}

mpld3.Markers.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.pointsobj.attr("transform", this.translate.bind(this));
}


/**********************************************************************/
/* Data Parsing Functions */
mpld3.draw_figure = function(figid, spec){
    var element = document.getElementById(figid);
    if(element === null){
	console.log(figid + " is not a valid id");
	return null;
    }
    var fig = new mpld3.Figure(figid, spec);
    fig.draw();
    return fig;
};


/**********************************************************************/
/* Convenience Functions                                              */


// Function to get an attribute, or substitute a default if it doesn't exist
mpld3.get_default = function(object, attr, default_val){
    return (attr in object) ? object[attr] : default_val;
};

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
