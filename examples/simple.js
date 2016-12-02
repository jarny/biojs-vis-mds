var mdsvis = require("biojs-vis-mds");

var coords = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7]];
var metadata = [ {celltype: 'B2', tissue: 'BM'},
                 {celltype: 'Mac', tissue: 'BM'},
                 {celltype: 'B2', tissue: 'LN'},
                 {celltype: 'Mac', tissue: 'LN'} ];

var onHover = function(data) {
  var groupNum = data.points[0].curveNumber;
  mdsvis.handlers.highlightGroup(rootDiv, groupNum);
};
var onUnhover = function(data) {
  mdsvis.handlers.unhighlight(rootDiv);
};
var onClick = function(data) {
  alert("Clicked: " + data.points[0].data.text);
};

var options = {
  metadata: metadata,
  layout: {
    width: 1000
  },
  onHover: onHover,
  onUnhover: onUnhover,
  onClick: onClick
};

var vis = mdsvis.create(rootDiv, coords, options);
vis.draw();
