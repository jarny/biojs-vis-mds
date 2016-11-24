(function(exports)
{

	/* -----------------------------------------------------------------------------------	 
	data = [{'name':'a', 'distance':0, 'colour':'blue'}, {'name':'b','distance':10, 'colour':'red'}];
	*/
	
	// Contructor
	var DistLinePlot = function(params) {
	
		this.svg = params['svg'],
		this.data = params['data'];
		this.mouseoverFunction = params['mouseover'];
		this.mouseoutFunction = params['mouseout'];
		this.clickFunction = params['click'];
	
		// svg elements
		this.circle;
		this.label;
		this.line;	// this is the line connecting the circle to the label
		
		this.xAxis;
		this.yAxis;
		this.circleScale;
		this.textScale;
		
// 		this.svgWidth = function() { return parseInt(this.svg.style("width")); }
		this.svgHeight = function() { return parseInt(this.svg.style("height")); }		
			
		this.firstPointY = params['firstPointY']==null? 10 : params['firstPointY'];	// where to put the first point in the y axis
		this.minLabelHeight = 12;	// stops labels getting too crowded by increasing svg height instead
	}

	DistLinePlot.prototype.draw = function(data)
	{
		var self = this;
		if (data) self.data = data;
		
		// determine minimum height required to render the plot and change svg height if so
		if (data.length*self.minLabelHeight>parseInt(self.svg.style("height")))
			self.svg.attr("height",data.length*10);
			
		self.circleScale = d3.scale.linear()
			.domain([d3.min(data.map(function(d) { return d.distance; })), d3.max(data.map(function(d) { return d.distance; }))])
			.range([self.firstPointY,self.svgHeight()-5]);

		self.textScale = d3.scale.linear()
			.domain([0,data.length])
			.range([self.firstPointY,self.svgHeight()-5]);
	
		self.svg.selectAll("*").remove();
	
		// draw the spine
		self.svg.append("line")
			.attr("x1", 20)
			.attr("x2", 20)
			.attr("y1", self.firstPointY)
			.attr("y2", self.svgHeight())
			.style("stroke", "#ccc")
			.style("stroke-width", 1);
	
		// draw the text label for each point
		self.label = self.svg.selectAll(".text")
			.data(data).enter()
		.append("text")
			.attr('class','text')
			.attr("x", 50)
			.attr("y", function(d,i) { return self.textScale(i); })
			.text(function(d) { return d.name + '  (' + d.distance.toFixed(2) + ')'; })
			.style('font','10px sans-serif')
			.on("mouseover", function(d,i) {
				self.highlightLabel(d,i);
				self.highlightCircle(d,i);
				self.highlightLine(d,i);
				if (self.mouseoverFunction) self.mouseoverFunction(d,i);
			})
			.on("mouseout", function(d,i) {
				self.removeHighlightLabel(d,i);
				self.removeHighlightCircle(d,i);
				self.removeHighlightLine(d,i);
				if (self.mouseoutFunction) self.mouseoutFunction(d,i);
			});

		// draw lines between circles and text
		self.line = self.svg.selectAll('.line')
			.data(data).enter()
		.append("line")
			.attr("x1", 20)
			.attr("x2", 47)
			.attr("y1", function(d) { return self.circleScale(d.distance); })
			.attr("y2", function(d,i) { return self.textScale(i)-4; })
			.style("stroke", function(d) { return d.colour; })
			.style("stroke-width", 1);

		self.circle = self.svg.selectAll(".circle")
			.data(data).enter()
		.append("circle")
			.attr("r",3)
			.attr("cx", 20)
			.attr("cy", function(d) { return self.circleScale(d.distance); })
			.style("fill", function(d) { return d.colour; })
			.on("mouseover", function(d,i) {
				self.highlightLabel(d,i);
				self.highlightCircle(d,i);
				self.highlightLine(d,i);
				if (self.mouseoverFunction) self.mouseoverFunction(d,i);
			})
			.on("mouseout", function(d,i) {
				self.removeHighlightLabel(d,i);
				self.removeHighlightCircle(d,i);
				self.removeHighlightLine(d,i);
				if (self.mouseoutFunction) self.mouseoutFunction(d,i);
			});
	}
	
	// Highlight matching circle
	DistLinePlot.prototype.highlightCircle = function(d,i)
	{
		var self = this;
		self.circle.each(function(x,j) {
			if (j!=i) d3.select(this).style("opacity", 0.3);
		});
	}
	DistLinePlot.prototype.removeHighlightCircle = function(d,i)
	{
		var self = this;
		self.circle.each(function(x) {
			d3.select(this).style("opacity", 1);
		});
	}

	// Highlight matching label
	DistLinePlot.prototype.highlightLabel = function(d,i)
	{
		var self = this;
		self.label.each(function(x,j) {
			if (j!=i) d3.select(this).style("opacity", 0.3);
		});
	}
	DistLinePlot.prototype.removeHighlightLabel = function(d,i)
	{
		var self = this;
		self.label.each(function(x) {
			d3.select(this).style("opacity", 1);
		});
	}
	
	// Highlight matching line
	DistLinePlot.prototype.highlightLine = function(d,i)
	{
		var self = this;
		self.line.each(function(x,j) {
			if (j!=i) d3.select(this).style("opacity", 0.3);
		});
	}
	DistLinePlot.prototype.removeHighlightLine = function(d,i)
	{
		var self = this;
		self.line.each(function(x) {
			d3.select(this).style("opacity", 1);
		});
	}
	
	// Return this.svg as html string
	DistLinePlot.prototype.svgAsHtml = function()
	{		
		var svgString = this.svg.node().parentNode.outerHTML
			.replace(/.*<svg .*?>/, "<svg width=\"400\" height=\"" + this.svgHeight() * 2 + "\" viewBox=\"0 0 200 " + this.svgHeight() + "\" preserveAspectRatio=\"xMinYMax meet\">");
		
		return svgString;



	}

	exports.DistLinePlot = DistLinePlot;
	
})(this.distlineplot = {});
