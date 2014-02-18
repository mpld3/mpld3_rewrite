/* mpld3.js: javascript backend for displaying interactive matplotlib plots */

var mpld3 = {
    version: "0.1"
};


/* Figure object */
mpld3.Figure = function(figid, figspec){
    this.figid = figid;
    this.root = d3.select("#" + figid);
    this.width = figspec.width;
    this.height = figspec.height;

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


/* Axes Object */
mpld3.Axes = function(fig, axspec){
    this.axnum = fig.axes.length;
    
    this.fig = fig;
    this.bbox = axspec.bbox;
    this.xlim = axspec.xlim;
    this.ylim = axspec.ylim;
    this.axesbg = ("axesbg" in axspec) ? axspec.axesbg : "#F9F9F9";
    this.xdomain = ("xdomain" in axspec) ? axspec.xdomain : this.xlim;
    this.ydomain = ("ydomain" in axspec) ? axspec.ydomain : this.ylim;
    this.xscale = ("xscale" in axspec) ? axspec.xscale : "linear";
    this.yscale = ("yscale" in axspec) ? axspec.yscale : "linear";
    this.xgridOn = ("xgridOn" in axspec) ? axspec.xgridOn : false;
    this.ygridOn = ("ygridOn" in axspec) ? axspec.ygridOn : false;
    this.axclass = ("axclass" in axspec) ? axspec.axclass : "axes";
    this.clipid = ("clipid" in axspec) ? axspec.clipid : "clip";
    this.zoomable = ("zoomable" in axspec) ? axspec.zoomable : true;
    
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

    this.elements.push(new mpld3.Axis(this, {"position": "left"}));
    this.elements.push(new mpld3.Axis(this, {"position": "bottom"}));

    if(this.xgridOn){
	this.elements.push(new mpld3.Grid(this, {xy:"x"}));
    }
    if(this.ygridOn){
	this.elements.push(new mpld3.Grid(this, {xy:"y"}));
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

mpld3.Axes.prototype.add_element = function(element){
    this.elements.push(element);
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


/* Axis object */
mpld3.Axis = function(axes, axspec){
    this.axes = axes;
    this.position = axspec.position;
    this.nticks = ("nticks" in axspec) ? axspec.nticks : 10;
    this.tickvalues = ("tickvalues" in axspec) ? axspec.tickvalues : null;
    this.tickformat = ("tickformat" in axspec) ? axspec.tickformat : null;
    this.stroke = ("stroke" in axspec) ? axspec.stroke : "black";

    this.shape_rendering = "crispEdges";
    this.fill = "none";

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

    // We need to write header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid
		     + " .axis line, .axis path "
		     + "{shape-rendering:crispEdges; "
		     + "stroke:black; fill:none;}")
    mpld3.insert_css("div#" + this.axes.fig.figid + " .axis text " +
		     "{font-family: sans-serif; font-size: 11px; " +
		     "fill: black; stroke: none;}")
};

mpld3.Axis.prototype.zoomed = function(){
    this.elem.call(this.axis);
};


/* Grid Object */
mpld3.Grid = function(axes, gridspec){
    this.axes = axes;
    if(gridspec.xy == "x"){
	this.class = "x grid"
	this.transform = "translate(0," + this.axes.height + ")";
	this.position = "bottom";
	this.scale = this.axes.xdom;
	this.tickSize = -this.axes.height;
    }else{
	this.class = "y grid"
	this.transform = "translate(0,0)";
	this.position = "left";
	this.scale = this.axes.ydom;
	this.tickSize = -this.axes.width;
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

    // We need to write header-level CSS to style these elements, because
    // zooming/panning creates new elements with these classes.
    mpld3.insert_css("div#" + this.axes.fig.figid
		     + " .grid .tick "
		     + "{stroke: gray;"
		     + " stroke-dasharray: 2,2;"
		     + " stroke-opacity: 0.3;}")
    mpld3.insert_css("div#" + this.axes.fig.figid + " .grid path " +
		     "{stroke-width: 0;}")
};

mpld3.Grid.prototype.zoomed = function(){
    this.elem.call(this.grid);
};


/* Line Element */
mpld3.Line = function(data, ax, lineid){
    this.data = data;
    this.ax = ax;
    this.lineid = lineid;
};

mpld3.Line.prototype.translate = function(d){
    { return "translate("
      + this.ax.x(d[0]) + ","
      + this.ax.y(d[1]) + ")"; };
};

mpld3.Line.prototype.draw = function(){
    this.line = d3.svg.line()
        .x(function(d) {return this.ax.x(d[0]);})
        .y(function(d) {return this.ax.y(d[1]);})
        .interpolate("linear")
        .defined(function (d) {return !isNaN(d[0]) && !isNaN(d[1]); });

    this.lineobj = this.ax.axes.append("svg:path")
        .attr("d", this.line(this.data))
        .attr('class', this.lineid);
}

mpld3.Line.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.lineobj.attr("d", this.line(this.data));
}


/* Markers Element */
mpld3.Markers = function(data, ax, id, markerpath){
    this.data = data;
    this.ax = ax;
    this.id = id;
    this.markerpath = markerpath;
};

mpld3.Markers.prototype.draw = function(){
    this.pointsobj = this.ax.axes.append("svg:g")
        .selectAll("scatter-dots-" + this.id)
        .data(this.data.filter(
            function(d){return !isNaN(d[0]) && !isNaN(d[1]); }))
        .enter().append("svg:path")
        .attr('class', 'points' + this.id)
        .attr("d", construct_SVG_path(this.markerpath))
        .attr("transform", this.translate.bind(this));
}

mpld3.Markers.prototype.zoomed = function(){
    // TODO: check if zoomable
    this.pointsobj.attr("transform", this.translate.bind(this));
}

/* Data Parsing Functions */
mpld3.draw_figure = function(spec, figid){
    var element = document.getElementById(figid);
    if(element === null){
	console.log(div_id + " is not a valid id");
	return null;
    }
    var fig = new mpld3.Figure(figid, spec);
    fig.draw();
    return fig;
};
    

/* Convenience Functions */


// Function to insert some CSS into the header
mpld3.insert_css = function(css){
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');

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
