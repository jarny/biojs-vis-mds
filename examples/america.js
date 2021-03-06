const mdsvis = require('biojs-vis-mds');

var cityDists = [
  [0, 587, 1212, 701, 1936, 604, 748, 2139, 2182, 543],
  [587, 0, 920, 940, 1745, 1188, 713, 1858, 1737, 597],
  [1212, 920, 0, 879, 831, 1726, 1631, 949, 1021, 1494],
  [701, 940, 879, 0, 1374, 968, 1420, 1645, 1891, 1220],
  [1936, 1745, 831, 1374, 0, 2339, 2451, 347, 959, 2300],
  [604, 1188, 1726, 968, 2339, 0, 1092, 2594, 2734, 923],
  [748, 713, 1631, 1420, 2451, 1092, 0, 2571, 2408, 205],
  [2139, 1858, 949, 1645, 347, 2594, 2571, 0, 678, 2442],
  [2182, 1737, 1021, 1891, 959, 2734, 2408, 678, 0, 2329],
  [543, 597, 1494, 1220, 2300, 923, 205, 2442, 2329, 0]];

var coords = mdsvis.mds(cityDists);

var names = ['Atlanta', 'Chicago', 'Denver', 'Houston', 'Los Angeles',
             'Miami', 'New York', 'San Francisco', 'Seattle', 'Washington, DC'];

var metadata = [];
for (var i=0; i < names.length; i++) {
  metadata.push({name: names[i]});
}

var options = {
  metadata: metadata,
  layout: {
    title: 'American cities',
    width: 900,
    height: 600
  },
  traceConfig: {
    marker: {size: 20}
  }
};

var vis = mdsvis.create(rootDiv, coords, options);

vis.draw();
