/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */
'use strict';

var mds = require('biojs-algo-mds');
var Plotly = require('plotly.js/lib/index-basic');
var _ = require('underscore');

var exports = {mds: mds.mds};

var rootDiv;
var plotDiv;
var allData;
var metadataSupplied = false;
var groupByKey = null;
var xDim = 0;
var yDim = 1;
var width;
var height;
var showLabels = false;

exports.run = function(opts) {
  if (opts.coords === undefined) {
    throw new Error('no coords supplied to mdsvis.run');
  }

  if (opts.el === undefined) {
    throw new Error('no root div supplied to mdsvis.run');
  }

  rootDiv = opts.el;

  width = opts.width || 700;
  height = opts.height || 450;

  var coords = opts.coords;
  var ndim = coords[0].length;
  rootDiv.appendChild(createDimSelector(ndim));

  // has any metadata been supplied?
  var metadata = {};
  if (opts.metadata !== undefined) {
    metadata = opts.metadata;
    metadataSupplied = true;
    rootDiv.appendChild(createGroupSelector(getGroups(metadata)));
  }

  rootDiv.appendChild(createShowLabelsTextbox());

  plotDiv = document.createElement('div');
  rootDiv.appendChild(plotDiv);

  init(coords, metadata);
};

var init = function(coords, metadata) {
  if (metadataSupplied) {
    // zip the coordinates to the corresponding metadata
    allData = _.map(_.zip(coords, metadata), function(zipped) {
      return _.extend({coord: zipped[0]}, zipped[1]);
    });

    // pick an arbitrary initial key to group on
    groupByKey = getGroups(metadata)[0];
  } else {
    allData = _.map(coords, function(c) {
      return {coord: c};
    });
  }

  console.log(allData);
  var layout = {
    title: 'MDS Plot',
    width: width,
    height: height,
    xaxis: {
      title: 'Dimension ' + (xDim+1),
      showgrid: false,
      zeroline: true
    },
    yaxis: {
      title: 'Dimension ' + (yDim+1),
      showgrid: false,
      zeroline: true
    }
  };
  var pts = getPoints(allData);
  console.log(pts);

  Plotly.newPlot(plotDiv, pts, layout);
};

var getPoints = function(data) {
  var pts;
  if (metadataSupplied) {
    var groups = _.groupBy(data, groupByKey);
    pts = _.map(groups, function(group, key) {
      return pointsFromSampleGroup(group, key);
    });
  } else {
    pts = [pointsFromSampleGroup(data, 'all points')];
  }
  return pts;
};

var pointsFromSampleGroup = function(data, groupname) {
  var coords = data.map(val => val.coord);

  var xPoints = coords.map(coord => coord[xDim]);
  var yPoints = coords.map(coord => coord[yDim]);
  return {
    x: xPoints,
    y: yPoints,
    type: 'scatter',
    mode: showLabels ? 'markers+text' : 'markers',
    name: groupname,
    text: groupname,
    textposition: "middle right",
    hoverinfo: "text",
    marker: {size: 10}
  };
};

var createDimSelector = function(ndim) {
  // pairs of dimension indices, from 1 to ndim
  var pairs = dimensionPairs(ndim);
  var selector = createSelector(pairs);

  selector.addEventListener('change', function() {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    xDim = pair[0]-1;
    yDim = pair[1]-1;
    updatePlot();
  });

  return selector;
};

var dimensionPairs = function(ndim) {
  var pairs = [];

  for (var i=1; i<=ndim; i++) {
    for (var j=i+1; j <=ndim; j++) {
      pairs.push([i,j]);
    }
  }

  return pairs;
};

var createGroupSelector = function(groups) {
  var selector = createSelector(groups);

  selector.addEventListener('change', function() {
    groupByKey = JSON.parse(selector.options[selector.selectedIndex].value);
    updatePlot();
  });

  return selector;
};

var createSelector = function(opts) {
  var selector = document.createElement('select');

  _.each(opts, function(val) {
    var opt = document.createElement('option');
    opt.value = JSON.stringify(val);
    opt.innerHTML = val.toString();
    selector.appendChild(opt);
  });

  return selector;
};

var createShowLabelsTextbox = function() {
  var checkbox = document.createElement('input');

  checkbox.setAttribute('type', 'checkbox');
  checkbox.innerHTML = 'show labels';

  checkbox.addEventListener('change', function() {
    if (checkbox.checked) {
      showLabels = true;
    } else {
      showLabels = false;
    }
    updatePlot();
  });

  return checkbox;
};

var updatePlot = function() {
  plotDiv.data = getPoints(allData);
  plotDiv.layout.xaxis.title = "Dimension " + (xDim+1);
  plotDiv.layout.yaxis.title = "Dimension " + (yDim+1);
  Plotly.redraw(plotDiv);
};

var getGroups = function(metadata) {
  var groups = [];
  var instance = metadata[0];
  for (var key in instance) {
    if (instance.hasOwnProperty(key)) {
      groups.push(key);
    }
  }
  return groups.sort();
};

module.exports = exports;
