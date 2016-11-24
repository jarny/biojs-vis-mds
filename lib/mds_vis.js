/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */

var vis = {};

var mds = require("biojs-algo-mds").mds;
var d3 = require("d3");

// main run function
vis.run = function(opts) {
  this.el = opts.el;
  this.el.textContent = biojsvismds.hello(opts.text);
};

// code from dataset.mako
// mds parameters
$scope.mdsDimensions = ['1,2','1,3','1,4','2,3','2,4','3,4'];
$scope.selectedMdsDimensions = $scope.mdsDimensions[0];

// colourFromSampleGroup

// $scope.plot
{
	$scope.plotname = 'mds plot';
	var mdsCoordinates = mdsClassic(distancesSubset,4);	// no need to recalculate if done earlier
	var coordinates = [];	// should look like [{'name':'sample1', 'x':2.3, 'y':-1.4, 'z':4.2}, ...]
	var coordinateIndex = $scope.selectedMdsDimensions.split(',')
	for (var i=0; i<samplesSubset.length; i++)
		coordinates.push({'x':mdsCoordinates[i][parseInt(coordinateIndex[0])-1], 
								      'y':mdsCoordinates[i][parseInt(coordinateIndex[1])-1], 
								      'name':samplesSubset[i][$scope.selectedSampleGroup], 
								      'colour':colourFromSampleGroup[$scope.selectedSampleGroup][samplesSubset[i][$scope.selectedSampleGroup]]});
	scatterPlot.draw(coordinates);
	scatterPlot.xAxisLabel.text('dimension ' + coordinateIndex[0]);
	scatterPlot.yAxisLabel.text('dimension ' + coordinateIndex[1]);
}

// $scope.updateLabels
{
if (scatterPlot.data==null) return; // we haven't plotted yet
// Update scatterPlot - name and colours of circles, and labels
for (var i=0; i<samplesSubset.length; i++) {
	var sg = $scope.selectedSampleGroup;
	scatterPlot.data[i].colour = colourFromSampleGroup[sg][samplesSubset[i][sg]];
	scatterPlot.data[i].name = samplesSubset[i][sg];
}
scatterPlot.draw();
}

// $scope.toggleLabels
$scope.toggleLabels = function()
{
	scatterPlot.showLabels = $scope.showLabels;
	if ($scope.showLabels) {
		scatterPlot.label.style('opacity',1);
		scatterPlot.setOverlappingLabelText();
	}
	else
		scatterPlot.label.style('opacity',0);
}

$scope.updatePlot = function()
{
	if ($scope.selectedRows.length==0 || 
			($scope.selectedPlot.indexOf('multidimensional')!=-1 && scatterPlot.data==null)	|| 
			($scope.selectedPlot.indexOf('minimum')!=-1 && mstPlot.data==null)) return;	// haven't plotted yet
		$scope.plot();
}

// Set the table of sample data - should trigger when selected sample group changes
$scope.setTable = function()
{
  $scope.rows = [];	// clear previous entries

  // work out a list of sample ids for each sample group item
  var sampleIdsFromSampleGroupItem = {};
  for (var i=0; i<samples.length; i++) {
    var sampleGroupItem = samples[i][$scope.selectedSampleGroup];
    if (!(sampleGroupItem in sampleIdsFromSampleGroupItem)) sampleIdsFromSampleGroupItem[sampleGroupItem] = [];
    sampleIdsFromSampleGroupItem[sampleGroupItem].push(samples[i]['sampleId']);
  }

  // populate table rows
  for (var sampleGroupItem in sampleIdsFromSampleGroupItem) {
    $scope.rows.push({'sampleGroupItem':sampleGroupItem, 
              'sampleIds':sampleIdsFromSampleGroupItem[sampleGroupItem],
              'colour':colourFromSampleGroup[$scope.selectedSampleGroup][sampleGroupItem]});
    $scope.selectedRows.push(true);
  }

  if ($scope.selectedSampleGroup in sampleGroupOrdering) { // order $scope.rows according to these
    // From http://stackoverflow.com/questions/13304543/javascript-sort-array-based-on-another-array
    var sorting = sampleGroupOrdering[$scope.selectedSampleGroup];
    $scope.rows = $scope.rows.map(function(row) {
      var n = sorting.indexOf(row.sampleGroupItem);
      sorting[n] = '';
      return [n, row];
    }).sort().map(function(j) { return j[1] })
  }
}

// Use this to select either all rows or none on the table quickly
$scope.selectRows = function(allOrNone)
{
  for (var i=0; i<$scope.selectedRows.length; i++)
    $scope.selectedRows[i] = allOrNone=='all';
  if (allOrNone=='all') $scope.updatePlot();
}

// define mouseover functions - pass these into plots that accept mouseover functions
function circleMouseover(d,j)
{
  CommonService.showTooltip('<p>' + d.name + '</p>');
  for (var i=0; i<$scope.rows.length; i++)
    $scope.rows[i].highlight = d.name==$scope.rows[i].sampleGroupItem;
  $scope.$apply();
}
function circleMouseout(d,j)
{
  CommonService.hideTooltip();
  for (var i=0; i<$scope.rows.length; i++)
    $scope.rows[i].highlight = false;
  $scope.$apply();
}

function drawDistLinePlot(d,i)
{
  // Create data array needed for distlinePlot. Mainly need distances from d to all other items
  // first gather distances for selected item together with their properties
  var data = [];
  for (var j=0; j<distancesSubset[i].length; j++) {
    data.push({'name':samplesSubset[j][$scope.selectedSampleGroup], 'distance':distancesSubset[i][j], 'colour':colourFromSampleGroup[$scope.selectedSampleGroup][samplesSubset[j][$scope.selectedSampleGroup]]});
  }
  data.sort(function(x,y) {
    if (x.distance<y.distance) return -1;
    else if (x.distance>y.distance) return 1;
    else return 0;
  });
  distlinePlot.draw(data);
}

$scope.rowMouseover = function(rowIndex,evt)
{
  var sampleGroupItem = $scope.rows[rowIndex].sampleGroupItem;		
  CommonService.showTooltip('<b>' + sampleGroupItem + '</b><br/>' + $scope.rows[rowIndex].sampleIds.join(', '),evt);

  if (scatterPlot.data!=null) {	// highlight matching item on the plot
    scatterPlot.highlightLabel(sampleGroupItem);
    scatterPlot.highlightCircle(sampleGroupItem);
  }
}
$scope.rowMouseout = function(rowIndex)
{
  var sampleGroupItem = $scope.rows[rowIndex].sampleGroupItem;
  CommonService.hideTooltip();

  if (scatterPlot.data!=null) {	// put matching item's state back to how it was
    scatterPlot.removeHighlightLabel(sampleGroupItem);
    scatterPlot.removeHighlightCircle(sampleGroupItem);
  }		
}

// Function to save figures to file ---------------------------------------------------
// figureIndex is used to denote either the main figure or the dist line plot: {0,1}
$scope.saveFigure = function(figureIndex)
{
  var html = figureIndex==0? scatterPlot.svgAsHtml() : distlinePlot.svgAsHtml();
  CommonService.showLoadingImage();

  // Since the svg doesn't include control div area, construct a useful file name using information there
  var filename = [$scope.selectedDataset.name, $scope.selectedPlot, $scope.selectedSampleGroup].join('_') + '.png';

      // convert svg to canvas		
  canvg('canvas', html);		

      // output as png
      var canvas = document.getElementById("canvas");
      var img = canvas.toDataURL("image/png");

  var link = document.createElement("a");
      link.setAttribute("href", img);
      link.setAttribute("download", filename);
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      CommonService.hideLoadingImage();	
}



$scope.closeSaveFigureDialog = function() { $scope.showSaveFigureDialog = false; }

// plotting objects
var scatterPlot = new scatterplot.ScatterPlot({'svg':d3.select("#mainSvg"), 'showLabels':$scope.showLabels, 'hideOverlappingLabels':true,
									                             'mouseover':circleMouseover, 'mouseout':circleMouseout, 'click':drawDistLinePlot});
var distlinePlot = new distlineplot.DistLinePlot({'svg':d3.select("#distlineSvg"), 'mouseover':circleMouseover, 'mouseout':circleMouseout});
var mstPlot = new mstplot.MstPlot({'svg':d3.select("#mainSvg"), 'mouseover':circleMouseover, 'mouseout':circleMouseout, 'click':drawDistLinePlot});

$scope.setTable();
$scope.plot();

// the html
		// <div style="margin-left:40px; margin-right:40px;" ng-controller="DatasetController">
// 			<h1 class="marquee" style="display:inline;">Dataset: {{selectedDataset.name}}</h1>
// 			<img src="/images/question_mark.png" ng-mouseover="commonService.showTooltip(helptext,$event)" ng-mouseout="commonService.hideTooltip()" width="20px" height="20px" style="margin-left:10px; opacity:0.7">
// 			<table width="100%" style="margin-top:20px;">
// 			<tr>
// 				<td style="width:20px;">
// 					<select ng-model="selectedDataset" ng-options="ds.name group by ds.platform for ds in datasets" ng-change="changeDataset()"></select>
// 				</td>
// 				<td>
// 					<!--<select ng-model="selectedPlot" ng-options="plot for plot in plots" ng-change="plot()"></select>&nbsp;-->
// 					<!-- <button ng-click="plot()">run</button> -->
// 					<span ng-show="selectedPlot=='multidimensional scaling plot'" style="margin-left:50px;">
// 						dimensions to show: <select ng-model="selectedMdsDimensions" ng-options="dim for dim in mdsDimensions" ng-change="plot()"></select>
// 						&nbsp; <input type="checkbox" ng-model="showLabels" ng-change="toggleLabels()"/>show labels &nbsp;
// 					</span>
// 				</td>
// 				<td style="padding-left:20px;">
// 					<a href="#" ng-click="showSaveFigureDialog=true">save figure</a>
// 				</td>
// 				<td>
// 					<select ng-model="selectedSampleGroup" ng-options="sampleGroup for sampleGroup in sampleGroups" ng-change="setTable(); updateLabels();"></select>
// 					&nbsp; <a href="#" ng-click="selectRows('all')">select all</a> &#47; <a href="#" ng-click="selectRows('none')">none</a>
// 				</td>
// 			</tr>
// 			<tr>
// 				<td></td>
// 				<td></td>
// 				<td></td>
// 				<td style="height:500px; vertical-align:top;" rowspan="2" >
// 					<table st-table="rows" class="dataTable" style="margin-top:10px">
// 						<thead>
// 						<tr>
// 							<th st-sort="sampleGroupItem">
// 								{{selectedSampleGroup}} ({{rows.length}}) 
// 							</th>
// 						</tr>
// 						</thead>
// 						<tbody style="display: block">
// 						<tr ng-repeat="row in rows" ng-class="{highlightBackground: row.highlight}" ng-mouseenter="rowMouseover($index,$event)" ng-mouseout="rowMouseout($index)">
// 							<td><input type="checkbox" ng-model="selectedRows[$index]" ng-change="updatePlot()">
// 							<span style="margin-left:10px; color:{{row.colour}}; font-size:24px; line-height:15px; vertical-align:middle;">&bull;</span>
// 							{{row.sampleGroupItem}} ({{row.sampleIds.length}})</td>
// 						</tr>
// 						</tbody>
// 					</table>
// 				</td>
// 			</tr>
// 			<tr>
// 				<td colspan="2"><p style="text-align:center">{{plotname}}</p><svg id="mainSvg" width="800" height="500" style="vertical-align:top;"></svg></td>
// 				<td><div style="width:125px; height:500px; overflow:auto;"><svg id="distlineSvg" width="120" height="450" style="vertical-align:top;"></svg></div></td>
// 			</tr>
// 			</table>
			
// 			<modal-dialog show='showSaveFigureDialog'>
// 				<div style="overflow:auto; padding:10px;">
// 					<h3>Save Figure</h3>
// 					<p>You can save the figures on this page as pdf files for print quality. You should manipulate the figure appropriately using the filters
// 					and zooms provided before saving, as you won't be able to interact with the figure once it is in the pdf format.</p>
// 					<p>Multiple figures are provided separately for full flexibility.</p>
// 					<p><a href="#" ng-click="saveFigure(0)">MDS plot</a> &#47; <a href="#" ng-click="saveFigure(1)">Line distance plot</a></p>
// 					<p><button ng-click="closeSaveFigureDialog()">close</button></p>
// 				</div>
// 			</modal-dialog>

// 		</div><!-- DatasetController -->

module.exports = vis;
