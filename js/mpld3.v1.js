/* mpld3.js: javascript backend for displaying interactive matplotlib plots */
/*   Author: Jake Vanderplas                                                */
/*   License: 3-clause BSD                                                  */

var mpld3 = {
    version: "0.1",
    figures: []
};


/* Figure object: */
mpld3.Figure = function(figid, prop){
    this.name = "mpld3.Figure";
    this.figid = figid;
    this.root = d3.select('#' + figid);

    var required = ["width", "height"];
    var defaults = {data:{},
		    axes:[],
		    toolbar:["reset","move"],
		    id: mpld3.generate_id(),
		   };
    this.prop = mpld3.process_props(this, prop, defaults, required);

    this.width = this.prop.width;
    this.height = this.prop.height;
    this.data = this.prop.data;
    this.toolbar = new mpld3.Toolbar(this, this.prop.toolbar);

    this.axes = [];
    for(var i=0; i<prop.axes.length; i++){
	this.axes.push(new mpld3.Axes(this, this.prop.axes[i]));
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

    this.enable_zoom();
    this.toolbar.draw();
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

mpld3.Figure.prototype.get_data = function(data){
    if(data === null || typeof(data) === "undefined"){
	return null;
    }else if(typeof(data) === "string"){
	return this.data[data];
    }else{
	return data;
    }
}


/* Toolbar Object: */
mpld3.Toolbar = function(fig, prop){
    this.name = "mpld3.Toolbar";
    this.fig = fig;
    this.prop = prop;
};

mpld3.Toolbar.prototype.draw = function(){
    this.toolbar = this.fig.root.append("div")
	                        .attr("class", "mpld3-toolbar");
    for(var i=0; i<this.prop.length; i++){
	switch(this.prop[i])
	{
	case "reset":
            this.toolbar
		.append("button")
		.attr("class", "mpld3-resetbutton")
		.style("background",
		       "#ffffff url(icons/home.png) no-repeat 1px 1px")
	        .style("border", "2px outset")
		.style("width", "38px")
		.style("height", "36px")
	        .style("cursor", "hand")
	        .on("mousedown", function(){d3.select(this)
                                            .style("border", "2px inset")
					    .style("background",
						   "#eeeeee url(icons/home.png) no-repeat 2px 2px");})
	        .on("mouseup", function(){d3.select(this)
                                          .style("border", "2px outset")
					  .style("background",
						 "#ffffff url(icons/home.png) no-repeat 1px 1px");})
		.on("click", this.fig.reset.bind(this.fig));
	    break;
	case "move":
            this.toolbar
		.append("button")
		.attr("class", "mpld3-movebutton")
		.style("background",
		       "#ffffff url(icons/move.png) no-repeat 1px 1px")
	        .style("border", "2px outset")
		.style("width", "38px")
		.style("height", "36px")
	        .style("cursor", "hand")
	        .on("mousedown", function(){d3.select(this)
                                            .style("border", "2px inset")
					    .style("background",
						   "#eeeeee url(icons/move.png) no-repeat 2px 2px");})
		.on("click", this.toggle_zoom.bind(this));
	    this.fig.disable_zoom();
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
    if(!(this.fig.zoom_on)){
	this.toolbar.selectAll(".mpld3-movebutton")
	        .style("border", "2px outset")
		.style("background",
		       "#ffffff url(icons/move.png) no-repeat 1px 1px");
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
		    "id": mpld3.generate_id(),
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
		    "paths": [],
		    "markers": [],
		    "texts": [],
		    "collections": [],
		    "sharex": [],
		    "sharey": [],
		    "images": []};
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
    var paths = this.prop.paths;
    var lines = this.prop.lines;
    var markers = this.prop.markers;
    var texts = this.prop.texts;
    var collections = this.prop.collections;
    var images = this.prop.images;

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

    // Add paths
    for(var i=0; i<paths.length;i++){
	this.elements.push(new mpld3.Path(this, paths[i]));
    }

    // Add markers
    for(var i=0; i<markers.length;i++){
	this.elements.push(new mpld3.Markers(this, markers[i]));
    }

    // Add text
    for(var i=0; i<texts.length; i++){
	this.elements.push(new mpld3.Text(this, texts[i]));
    }

    // Add collections
    for(var i=0; i<collections.length; i++){
	this.elements.push(new mpld3.PathCollection(this, collections[i]));
    }

    // Add images
    for(var i=0; i<images.length; i++){
	this.elements.push(new mpld3.Image(this, images[i]));
    }

    // Sort by zorder
    this.elements.sort(function(a,b){return a.prop.zorder - b.prop.zorder});
}

mpld3.Axes.prototype.xfigure = function(x){
    return x - this.position[0];
}

mpld3.Axes.prototype.yfigure = function(y){
    return this.fig.height - this.position[1] - y;
}

mpld3.Axes.prototype.draw = function(){
    for(var i=0; i<this.prop.sharex.length; i++){
	this.sharex.push(mpld3.get_object_by_id(this.prop.sharex[i]));
    }

    for(var i=0; i<this.prop.sharey.length; i++){
	this.sharey.push(mpld3.get_object_by_id(this.prop.sharey[i]));
    }

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
    // TODO: apply propagation fix from aflaxman

    // propagate is a boolean specifying whether to propagate movements
    // to shared axes, specified by sharex and sharey.  Default is true.
    propagate = (typeof propagate == 'undefined') ? true : propagate;
    
    for(var i=0; i<this.elements.length; i++){
	this.elements[i].zoomed();
    }
    
    if(propagate){
	// update shared x axes
	for(var i=0; i<this.sharex.length; i++){
	    if(this.sharex[i] === null) continue;
	    this.sharex[i].zoom.x().domain(this.zoom.x().domain());
	    this.sharex[i].zoomed(false);
	}
	// update shared y axes
	for(var i=0; i<this.sharey.length; i++){
	    if(this.sharey[i] === null) continue;
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


/* Axis object */
mpld3.Axis = function(axes, prop){
    this.name = mpld3.Axis;
    this.axes = axes;

    var required = ["position"]
    var defaults = {nticks : 10,
		    tickvalues : null,
		    tickformat : null,
		    fontsize : "11px",
		    fontcolor : "black",
		    axiscolor : "black",
		    zorder: 0,
		    id: mpld3.generate_id()}
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
		    alpha : "0.5",
		    zorder: 0,
		    id: mpld3.generate_id()};
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
// TODO: should this be removed? Everything Line can do, Path can do (better)
mpld3.Line = function(ax, prop){
    this.name = "mpld3.Line";
    this.ax = ax;

    var required = ["data"]
    var defaults = {xindex: 0,
		    yindex: 1,
		    coordinates: "data",
		    color: "salmon",
		    linewidth: 2,
		    dasharray: "10,0",
		    alpha: 1.0,
		    zorder: 2,
		    id: mpld3.generate_id()};
    
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.data = ax.fig.get_data(this.prop.data);
};

mpld3.Line.prototype.filter = function(d){
    return (!isNaN(d[this.prop.xindex])
	    && !isNaN(d[this.prop.yindex]));
};

mpld3.Line.prototype.draw = function(){
    this.linefunc = d3.svg.line()
        .interpolate("linear")
        .defined(this.filter.bind(this));

    if(this.prop.coordinates === "data"){
	this.linefunc
            .x(function(d) {return this.ax.x(d[this.prop.xindex]);})
            .y(function(d) {return this.ax.y(d[this.prop.yindex]);});
    }else{
	this.linefunc
            .x(function(d) {return this.ax.xfigure(d[this.prop.xindex]);})
            .y(function(d) {return this.ax.yfigure(d[this.prop.yindex]);});
    }

    this.line = this.ax.axes.append("svg:path")
	.data(this.data)
        .attr("d", this.linefunc(this.data))
        .attr('class', 'line')
	.style("stroke", this.prop.color)
	.style("stroke-width", this.prop.linewidth)
	.style("stroke-dasharray", this.prop.dasharray)
	.style("stroke-opacity", this.prop.alpha)
	.style("fill", "none");
}

mpld3.Line.prototype.zoomed = function(){
    // TODO: check coordinates (data vs figure)
    if(this.prop.coordinates === "data"){
	this.line.attr("d", this.linefunc(this.data));
    }
}


/* Path Element */
mpld3.Path = function(ax, prop){
    this.name = "mpld3.Path";
    this.ax = ax;

    var required = ["data"]
    var defaults = {xindex: 0,
		    yindex: 1,
		    coordinates: "data",
		    facecolor: "green",
		    edgecolor: "black",
		    edgewidth: 1,
		    dasharray: "10,0",
		    pathcodes: null,
		    offset: null,
		    offsetcoordinates: "data",
		    alpha: 1.0,
		    zorder: 1,
		    id: mpld3.generate_id()};
    
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.data = ax.fig.get_data(this.prop.data);
    this.pathcodes = this.prop.pathcodes;

    this.xmap = {points:function(x){return x;},
		 data:this.ax.x.bind(this.ax),
		 figure:this.ax.xfigure.bind(this.ax)}
    this.ymap = {points:function(y){return y;},
		 data:this.ax.y.bind(this.ax),
		 figure:this.ax.yfigure.bind(this.ax)}    
};

mpld3.Path.prototype.draw = function(){
    this.pathfunc = mpld3.path()
	.x(function(d){return this.xmap[this.prop.coordinates]
		                    (d[this.prop.xindex]);})
	.y(function(d){return this.ymap[this.prop.coordinates]
		                    (d[this.prop.yindex]);});

    this.path = this.ax.axes.append("svg:path")
        .attr("d", this.pathfunc(this.data, this.pathcodes))
        .attr('class', "path")
	.style("stroke", this.prop.edgecolor)
	.style("stroke-width", this.prop.edgewidth)
	.style("stroke-dasharray", this.prop.dasharray)
	.style("stroke-opacity", this.prop.alpha)
	.style("fill", this.prop.facecolor)
	.style("fill-opacity", this.prop.alpha)
        .attr("vector-effect", "non-scaling-stroke");

    if(this.prop.offset !== null){
	var offset = [this.xmap[this.prop.offsetcoordinates]
		          (this.prop.offset[0]),
		      this.ymap[this.prop.offsetcoordinates]
		          (this.prop.offset[1])];    
	this.path.attr("transform", "translate(" + offset + ")");
    }
}

mpld3.Path.prototype.zoomed = function(){
    if(this.prop.coordinates === "data"){
	this.path.attr("d", this.pathfunc(this.data, this.pathcodes));
    }
    if(this.prop.offset !== null && this.prop.offsetcoordinates === "data"){
	var offset = [this.ax.x(this.prop.offset[0]),
		      this.ax.y(this.prop.offset[1])];
	this.path.attr("transform", "translate(" + offset + ")");
    }
}


/* Markers Element */
mpld3.Markers = function(ax, prop){
    this.name = "mpld3.Markers";
    this.ax = ax;
    
    var required = ["data"];
    var defaults = {xindex: 0,
		    yindex: 1,
		    coordinates: "data",
		    facecolor: "salmon",
		    edgecolor: "black",
		    edgewidth: 1,
		    alpha: 1.0,
		    markersize: 6,
		    markername: "circle",
		    markerpath: null,
		    zorder: 3,
		    id: mpld3.generate_id()};
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.data = ax.fig.get_data(this.prop.data);

    if(this.prop.markerpath !== null){
	this.marker = mpld3.path().call(this.prop.markerpath[0],
					this.prop.markerpath[1]);
    }else{
	this.marker = d3.svg.symbol(this.prop.markername)
	                           .size(Math.pow(this.prop.markersize, 2));
    }
};

mpld3.Markers.prototype.translate = function(d){
    if(this.prop.coordinates === "data"){
	return "translate("
	    + this.ax.x(d[this.prop.xindex]) + ","
	    + this.ax.y(d[this.prop.yindex]) + ")";
    }else{
	return "translate("
	    + this.ax.xfigure(d[this.prop.xindex]) + ","
	    + this.ax.yfigure(d[this.prop.yindex]) + ")";
    }
};

mpld3.Markers.prototype.filter = function(d){
    return (!isNaN(d[this.prop.xindex])
	    && !isNaN(d[this.prop.yindex]));
};

mpld3.Markers.prototype.draw = function(){
    this.group = this.ax.axes.append("svg:g")
    this.pointsobj = this.group.selectAll("paths")
        .data(this.data.filter(this.filter.bind(this)))
        .enter().append("svg:path")
          .attr('class', 'mpld3-marker')
          .attr("d", this.marker)
          .attr("transform", this.translate.bind(this))
          .style("stroke-width", this.prop.edgewidth)
          .style("stroke", this.prop.edgecolor)
          .style("fill", this.prop.facecolor)
          .style("fill-opacity", this.prop.alpha)
          .style("stroke-opacity", this.prop.alpha)
          .attr("vector-effect", "non-scaling-stroke");
};

mpld3.Markers.prototype.zoomed = function(){
    if(this.prop.coordinates === "data"){
	this.pointsobj.attr("transform", this.translate.bind(this));
    }
}

/* Path Collection Element */
mpld3.PathCollection = function(ax, prop){
    window.prop = prop;
    this.ax = ax;
    var required = ["paths", "offsets"]
    var defaults = {xindex: 0,
		    yindex: 1,
		    pathtransforms: [],
		    pathcoordinates: "points",
		    offsetcoordinates: "data",
		    offsetorder: "before",
		    edgecolors: ["#000000"],
		    edgewidths: [1.0],
		    facecolors: ["#0000FF"],
		    alphas: [1.0],
		    zorder: 2,
		    id: mpld3.generate_id()};
    this.prop = mpld3.process_props(this, prop, defaults, required);
    this.paths = prop.paths;
    this.get = function(L, i, dflt){return L.length ? L[i % L.length] : dflt;}

    var offsets = this.ax.fig.get_data(this.prop.offsets);
    if(offsets === null || offsets.length === 0){
	offsets = [null];
    }

    // For use in the draw() command, expand offsets to size N
    var N = Math.max(this.prop.paths.length, offsets.length);

    this.offsets = [];
    for(var i=0; i<N; i++){
	var o = offsets[i % offsets.length];
	this.offsets.push([o[this.prop.xindex], o[this.prop.yindex]]);
    }

    this.xmap = {points:function(x){return x;},
		 data:this.ax.x.bind(this.ax),
		 figure:this.ax.xfigure.bind(this.ax)}
    this.ymap = {points:function(y){return y;},
		 data:this.ax.y.bind(this.ax),
		 figure:this.ax.yfigure.bind(this.ax)}    
};

mpld3.PathCollection.prototype.transform_func = function(d, i){
    // here we apply the offset and the individual path transform
    var transform;
    var t = this.prop.pathtransforms;
    if(t.length > 0){
	t = t[i % t.length];
	transform = d3.transform("matrix(" + t + ")").toString();
    }else{
	transform = "";
    }

    var offset;
    if(d === null || typeof(d) === "undefined"){
	offset = "translate(0, 0)";
    }else{
	offset = ("translate("
		  + [this.xmap[this.prop.offsetcoordinates](d[0]),
		     this.ymap[this.prop.offsetcoordinates](d[1])]
		  +")");
    }

    if(this.prop.offsetorder === "after"){
	return transform + offset;
    }else{
	return offset + transform;
    }
};

mpld3.PathCollection.prototype.path_func = function(d, i){
    var path = this.paths[i % this.paths.length]
    var ret = mpld3.path()
                .x(function(d){return this.xmap[this.prop.pathcoordinates](d[0]);}.bind(this))
                .y(function(d){return this.ymap[this.prop.pathcoordinates]
		                            (d[1]);}.bind(this))
                .call(path[0], path[1]);
    return ret;
};

mpld3.PathCollection.prototype.style_func = function(d, i){
    var prop = this.prop;
    var styles = {"stroke": prop.edgecolors[i % prop.edgecolors.length],
		  "fill": prop.facecolors[i % prop.facecolors.length],
		  "stroke-width": prop.edgewidths[i % prop.edgewidths.length],
		  "stroke-opacity": prop.alphas[i % prop.alphas.length],
		  "fill-opacity": prop.alphas[i % prop.alphas.length]};
    var ret = ""
    for(key in styles){
	ret += key + ":" + styles[key] + ";"
    }
    return ret
};

mpld3.PathCollection.prototype.draw = function(){
    this.group = this.ax.axes.append("svg:g");
    this.pathsobj = this.group.selectAll("paths")
                   .data(this.offsets)
                   .enter().append("svg:path")
                      .attr("vector-effect", "non-scaling-stroke")
                      .attr("class", "mpld3-path")
                      .attr("d", this.path_func.bind(this))
                      .attr("style", this.style_func.bind(this))
                      .attr("transform", this.transform_func.bind(this));
};

mpld3.PathCollection.prototype.zoomed = function(){
    if(this.prop.pathcoordinates === "data"){
	this.pathsobj.attr("d", this.path_func.bind(this));
    }
    if(this.prop.offsetcoordinates === "data"){
	this.pathsobj.attr("transform", this.transform_func.bind(this));
    }
};

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
				     alpha: 1.0,
				     zorder: 3,
				     id: mpld3.generate_id()},
				    ["text", "position"]);
    this.text = this.prop.text;
    this.position = this.prop.position;
};

mpld3.Text.prototype.draw = function(){
    var pos_x, pos_y;
    if(this.prop.coordinates == "data"){
	pos_x = this.ax.x(this.position[0]);
	pos_y = this.ax.y(this.position[1]);
	this.obj = this.ax.axes.append("text")
            .attr("x", pos_x)
            .attr("y", pos_y);
    }else{
	pos_x = this.position[0];
	pos_y = this.ax.fig.height - this.position[1];
	this.obj = this.ax.fig.canvas.append("text")
            .attr("x", pos_x)
            .attr("y", pos_y);
    }

    if(this.prop.rotation){
	this.obj.attr("transform", "rotate(" + this.prop.rotation + ","
                      + pos_x + "," + pos_y + ")");
    }

    this.obj.attr("class", "text")
        .text(this.text)
        .style("text-anchor", this.prop.h_anchor)
	.style("dominant-baseline", this.prop.v_baseline)
	.style("font-size", this.prop.fontsize)
	.style("fill", this.prop.color)
	.style("opacity", this.prop.alpha);
};

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
};

/* Image Object */
mpld3.Image = function(ax, prop){
    this.ax = ax;
    required = ["data", "extent"];
    defaults = {alpha: 1.0,
		coordinates: "data",
		zorder: 1,
		id: mpld3.generate_id()};
    this.prop = mpld3.process_props(this, prop, defaults, required);
};

mpld3.Image.prototype.draw = function(){
    this.image = this.ax.axes.append("svg:image")
	.attr('class', 'mpld3-image')
        .attr('xlink:href', "data:image/png;base64," + this.prop.data)
	.style({'opacity': this.prop.alpha})
        .attr("preserveAspectRatio", "none");
    this.zoomed();
};

mpld3.Image.prototype.zoomed = function(){
    var extent = this.prop.extent;
    this.image
	.attr("x", this.ax.x(extent[0]))
        .attr("y", this.ax.y(extent[3]))
        .attr("width", this.ax.x(extent[1]) - this.ax.x(extent[0]))
        .attr("height", this.ax.y(extent[2]) - this.ax.y(extent[3]));
};

/**********************************************************************/
/* Data Parsing Functions */
mpld3.draw_figure = function(figid, spec){
    var element = document.getElementById(figid);
    if(element === null){
	throw (figid + " is not a valid id");
	return null;
    }
    var fig = new mpld3.Figure(figid, spec);
    mpld3.figures.push(fig);
    fig.draw();
    return fig;
};


/**********************************************************************/
/* Convenience Functions                                              */

mpld3.generate_id = function(N, chars){
    if(typeof(N) === "undefined"){N=10;}
    if(typeof(chars) === "undefined"){chars = ("abcdefghijklmnopqrstuvwxyz" +
					       "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
					       "0123456789");}
    var id = "";
    for(var i=0; i<N; i++)
        id += chars.charAt(Math.round(Math.random() * (chars.length - 1)));
    return id;
}

mpld3.get_object_by_id = function(id, fig){
    // TODO: should elements be stored in a map/hash table instead?
    // It would make this more efficient.
    var figs_to_search, ax, el;
    if(typeof(fig) === "undefined"){
	figs_to_search = mpld3.figures;
    }else if(typeof(fig.length) === "undefined"){
	figs_to_search = [fig];
    }else{
	figs_to_search = fig;
    }
    for(var i=0; i<figs_to_search.length; i++){
	fig = figs_to_search[i];
	if(fig.prop.id === id){
	    return fig;
	}
	for(var j=0; j<fig.axes.length; j++){
	    ax = fig.axes[j];
	    if(ax.prop.id === id){
		return ax;
	    }
	    for(var k=0; k<ax.elements.length; k++){
		el = ax.elements[k];
		if(el.prop.id === id){
		    return el;
		}
	    }
	}
    }
    return null;
}

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


function mpld3_functor(v) {
    return typeof v === "function" ? v : function() {
	return v;
    };
}

function mpld3_path(_){
    var x = function(d){return d[0];}
    var y = function(d){return d[1];}

    // number of vertices for each SVG code
    var n_vertices = {M:1, m:1, L:1, l:1, Q:2, q:2, T:2, t:2,
		      S:3, s:3, C:3, c:3, Z:0, z:0};

    function path(vertices, pathcodes){
	// If pathcodes is not defined, we assume it's simply a straight line
	var fx = mpld3_functor(x), fy = mpld3_functor(y);
	if((pathcodes === null) || (typeof(pathcodes) === "undefined")){
	    pathcodes = ["M"];
	    for(var i=0; i<vertices.length - 1; i++){
		pathcodes.push("L");
	    }
	}

	var data = "";
	var j = 0;  // counter for vertices
	for (var i=0;i<pathcodes.length;i++){
	    data += pathcodes[i]
	    for(var jj=j; jj<j+n_vertices[pathcodes[i]]; jj++){
		data += fx.call(this, vertices[jj]) + " ";
		data += fy.call(this, vertices[jj]) + " ";
	    }
	    j += n_vertices[pathcodes[i]];
	}
	if(j != vertices.length){
	    console.warn("Warning: not all vertices used in Path");
	}
	return data;
    }

    path.x = function(_) {
	if (!arguments.length) return x;
	x = _;
	return path;
    };

    path.y = function(_) {
	if (!arguments.length) return y;
	y = _;
	return path;
    };

    path.call = path;

    return path;
}

mpld3.path = function(){
    return mpld3_path();
}
