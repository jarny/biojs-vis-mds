(function(exports)
{

	/* -----------------------------------------------------------------------------------

	*/
	
	// Contructor
	var ScatterPlot = function(params) {

		this.svg = params['svg'],
		this.data = params['data'];
		this.mouseoverFunction = params['mouseover'];
		this.mouseoutFunction = params['mouseout'];
		this.clickFunction = params['click'];
	
		// svg elements
		this.circle;
		this.label;
		this.xAxis;
		this.yAxis;
		this.xAxisLabel;
		this.yAxisLabel;
		this.xScale;
		this.yScale;
		
		this.svgWidth = function() { return parseInt(this.svg.style("width")); }
		this.svgHeight = function() { return parseInt(this.svg.style("height")); }	
	
		this.showLabels = params['showLabels']==null? true : params['showLabels'];
		this.hideOverlappingLabels = params['hideOverlappingLabels']==null? false : params['hideOverlappingLabels'];
		this.circleRadius = params['circleRadius']==null? 5 : params['circleRadius'];
	}

	ScatterPlot.prototype.draw = function(data)
	{
		var self = this;
		if (data!=null) self.data = data;
	
		// Need max/min values for scaling
		var xMax = d3.max(self.data.map(function(d) { return d.x; })) * 1.01,
			xMin = d3.min(self.data.map(function(d) { return d.x; })) * 1.05,
			yMax = d3.max(self.data.map(function(d) { return d.y; })) * 1.15,
			yMin = d3.min(self.data.map(function(d) { return d.y; })) * 1.15;
	
		// axes on bottom and left so leave margins there
		var margin = {top: 0, right: 0, bottom: 50, left: 60},
			width = self.svg.attr('width') - margin.left - margin.right,
			height = self.svg.attr('height') - margin.top - margin.bottom;
				
		// remove all previous items
		self.svg.selectAll('*').remove();

		//Define scales
		self.xScale = d3.scale.linear()
			.domain([xMin, xMax])
			.range([margin.left, width-margin.right]);

		self.yScale = d3.scale.linear()
			.domain([yMin, yMax])
			.range([height-margin.top, margin.bottom]);

		// Create circle points
		self.circle = self.svg.selectAll(".circle")
			.data(self.data)
		.enter().append("circle")
			.attr("class", "circle")
			.attr("transform", function(d) {
				return "translate("+self.xScale(d.x)+","+self.yScale(d.y)+")";
			})
			.attr("r", self.circleRadius)
			.style("fill", function(d) { return d.colour? d.colour : '#ccc'; })
			.on("mouseover", function(d,i) {
				if (self.showLabels) self.highlightLabel(d.name);
				self.highlightCircle(d.name);
				if (self.mouseoverFunction) self.mouseoverFunction(d);
			})
			.on("mouseout", function(d,i) {
				if (self.showLabels) self.removeHighlightLabel(d.name);
				self.removeHighlightCircle(d.name);
				if (self.mouseoutFunction) self.mouseoutFunction(d);
			})
			.on("click", function(d,i) {
				if (self.clickFunction) self.clickFunction(d,i);
			});

		// Create text labels
		self.label = self.svg.selectAll(".text")
			.data(self.data)
		.enter().append("text")
			.attr("class","label")
			.attr("transform", function(d) {
				return "translate("+(self.xScale(d.x)+self.circleRadius)+","+(self.yScale(d.y)-self.circleRadius)+")";
			})
			.text(function(d) { return d.name; })
			.style('font','10px sans-serif')
			.style('opacity', self.showLabels? 1 : 0)	// can make this 0 for transition
			.on("mouseover", function(d,i) {
				if (self.showLabels) self.highlightLabel(d.name);
				self.highlightCircle(d.name);
				if (self.mouseoverFunction) self.mouseoverFunction(d);
			})
			.on("mouseout", function(d,i) {
				if (self.showLabels) self.removeHighlightLabel(d.name);
				self.removeHighlightCircle(d.name);
				if (self.mouseoutFunction) self.mouseoutFunction(d);
			})
			.on("click", function(d,i) {
				if (self.clickFunction) self.clickFunction(d,i);
			});
			
		// x and y axis
		self.xAxis = d3.svg.axis().scale(self.xScale).orient("bottom").ticks(5);
		self.yAxis = d3.svg.axis().scale(self.yScale).orient("left").ticks(5);

		// Create axes
		self.svg.append("g")
			.attr("class", "x axis")
			.style("opacity",0.9)
			.attr("transform", "translate(0," + height + ")")
			.call(self.xAxis);
		self.svg.append("g")
			.attr("class", "y axis")
			.style("opacity",0.9)
			.attr("transform", "translate(" + margin.left + ",0)")
			.call(self.yAxis);

		// Create x Axis label
		self.xAxisLabel = self.svg.append("text")
			.attr("text-anchor", "end")
			.attr("opacity","0.8")
			.attr("x", width)
			.attr("y", height + margin.bottom - 10)
			.text("dimension 1");

		// Create y Axis label
		self.yAxisLabel = self.svg.append("text")
			.attr("text-anchor", "end")
			.attr("opacity","0.8")
			.attr("y", margin.top)
			.attr("x", margin.left-120)
			.attr("dy", ".75em")
			.attr("transform", "rotate(-90)")
			.text("dimension 2");

		// Enable zoom
		var zoom = d3.behavior.zoom()
			.x(self.xScale).y(self.yScale)	// need this for zooming on scaled elements
			.scaleExtent([1, 10]);

		zoom.on("zoom", function() {
			self.svg.select(".x.axis").call(self.xAxis);
			self.svg.select(".y.axis").call(self.yAxis);   
			self.svg.selectAll(".circle").attr("transform", function(d) { return "translate(" + self.xScale(d.x) + "," + self.yScale(d.y) + ")"; });
			self.svg.selectAll(".label").attr("transform", function(d) { return "translate(" + (self.xScale(d.x) + self.circleRadius) + "," + (self.yScale(d.y) - self.circleRadius) + ")"; });
		});
		self.svg.call(zoom);
	
		if (self.showLabels && self.hideOverlappingLabels) self.setOverlappingLabelText();
	}

	ScatterPlot.prototype.setOverlappingLabelText = function()
	{
		var self = this;
		var delta = 2;	// slight margin outside the immediate text box
		var hiddenLabels = [];
	
		self.label.each(function (d, i) {
			if (hiddenLabels.indexOf(i)!=-1) return;
			a = this;
			da = d3.select(a);
			var ta = d3.transform(da.attr("transform")),
				xa0 = ta.translate[0] - delta,
				ya0 = ta.translate[1] - delta;
			var xa1 = xa0 + this.getBBox().width + delta,
				ya1 = ya0 + this.getBBox().height + delta;

			self.label.each(function (e, j) {
				b = this;
				db = d3.select(b);			

				// a & b are the same element or text labels differ
				if (a == b || da.text()!=db.text()) return;
			
				var tb = d3.transform(db.attr("transform")),
					xb0 = tb.translate[0],
					yb0 = tb.translate[1];
			
				//if (da.text()=='Erythroblast (P+O)') console.log(da.text(), xa0, ya0, xa1, ya1, xb0, yb0, JSON.stringify(hiddenLabels));

				// condition for overlap
				if (xb0-xa0 && xb0<xa1 && yb0>ya0 && yb0<ya1) {
					db.text('');
					hiddenLabels.push(j);
				}
			});
		});
	}

	// Highlight all circles with name of data matching name
	ScatterPlot.prototype.highlightCircle = function(name)
	{
		var self = this;
		self.circle.each(function(d) {
			if (d.name!=name) d3.select(this).style("opacity",0.3);
		});
	}
	ScatterPlot.prototype.removeHighlightCircle = function(name)
	{
		var self = this;
		self.circle.each(function(d) {
			d3.select(this).style("opacity",1);
		});
	}

	// Highlight all labels with name of data matching name
	ScatterPlot.prototype.highlightLabel = function(name)
	{
		var self = this;
		self.label.each(function(d) {
			if (d.name==name)
				d3.select(this).style('opacity', 1)	// show this text regardless of self.showLabels
			else
				d3.select(this).style("opacity", self.showLabels? 0.5 : 0);
		});
		if (self.hideOverlappingLabels) self.setOverlappingLabelText();
	}
	ScatterPlot.prototype.removeHighlightLabel = function(name)
	{
		var self = this;
		self.label.each(function(d) {
			d3.select(this).style("opacity", self.showLabels? 1 : 0);
		});
		if (self.showLabels && self.hideOverlappingLabels) self.setOverlappingLabelText();
	}

	// Return this.svg as html string
	ScatterPlot.prototype.svgAsHtml = function()
	{		
		var self = this;
		var height = self.svgHeight();
		var width = self.svgWidth();
	
		var svgString = this.svg.node().parentNode.outerHTML
			.replace(/<path /g, "<path style='stroke:#cfcfcf; stroke-width:1px; fill:none;' ")
			.replace(/<line /g, "<line style='stroke:#cfcfcf; stroke-width:1px; fill:none; shape-rendering: crispEdges;' ")
			.replace(/.*<svg .*?>/, "<svg width=\"" + width * 2 + "\" height=\"" + height * 2 + "\" viewBox=\"0 0 " + width + " " + height + " \" preserveAspectRatio=\"xMinYMax meet\">");
		
		return svgString;

	}
	
	exports.ScatterPlot = ScatterPlot;
	
})(this.scatterplot = {});
