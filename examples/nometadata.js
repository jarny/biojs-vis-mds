// if you don't specify a html file, the sniper will generate a div with id "rootDiv"
var mdsvis = require("biojs-vis-mds");
var points = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7]];
mdsvis.run({
  el: rootDiv,
  coords: points
});
