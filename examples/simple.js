// if you don't specify a html file, the sniper will generate a div with id "rootDiv"
var mdsvis = require("biojs-vis-mds");
var points = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7]];
var metadata = [ {celltype: 'B2', tissue: 'BM'},
                 {celltype: 'Mac', tissue: 'BM'},
                 {celltype: 'B2', tissue: 'LN'},
                 {celltype: 'Mac', tissue: 'LN'} ];
mdsvis.run({
  el: rootDiv,
  coords: points,
  metadata: metadata
});
