// if you don't specify a html file, the sniper will generate a div with id "rootDiv"
var mdsvis = require("biojs-vis-mds");

var root1 = document.createElement('div');
var root2 = document.createElement('div');
rootDiv.appendChild(root1);
rootDiv.appendChild(root2);

// data
var points = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7]];
var metadata = [ {celltype: 'B2', tissue: 'BM'},
                 {celltype: 'Mac', tissue: 'BM'},
                 {celltype: 'B2', tissue: 'LN'},
                 {celltype: 'Mac', tissue: 'LN'} ];

// define event handlers
var onHover = function(data) {
  var groupNum = data.points[0].curveNumber;
  mdsvis.callbacks.highlightGroup(rootDiv, groupNum);
  console.log("hovering!");
};
var onUnhover = function(data) {
  mdsvis.callbacks.unhighlight(rootDiv);
};
var onClick = function(data) {
  alert("Clicked!");
  console.log(data);
};

var options1 = {
  coords: points,
  metadata: metadata,
  layout: {
    title: 'First plot',
    width: 1000
  },
  onHover: onHover,
  onUnhover: onUnhover,
  onClick: onClick
};

var options2 = {
  coords: points,
  metadata: metadata,
  layout: {
    title: 'Second plot',
    hovermode: 'compare',
    width: 1000,
    height: 800,
    xaxis: {showgrid: true},
    yaxis: {showgrid: true}
  },
  traceConfig: {
    marker: {size: 20}
  },
  onHover: onHover,
  onUnhover: onUnhover,
  onClick: onClick
};

var vis1 = mdsvis.create(root1, options1);
var vis2 = mdsvis.create(root2, options2);
vis1.draw();
vis2.draw();
