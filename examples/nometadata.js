var mdsvis = require("biojs-vis-mds");

var coords = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7] ];

var vis = mdsvis.create(rootDiv, coords);

vis.draw();
