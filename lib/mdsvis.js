/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */
'use strict';

var mds = require('biojs-algo-mds');
var utils = require('./utils');
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
var layout;
var configOptions;
var traceConfig;
var showLabels = false;

// callbacks
var onClick;
var onHover;
var onUnhover;

const defaultLayout = {
  title: 'MDS Plot',
  width: 700,
  height: 450,
  hovermode: 'closest',
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

const defaultConfig = {
  modeBarButtonsToRemove: [
    'select2d',
    'lasso2d',
    'autoScale2d',
    'hoverClosestCartesian',
    'hoverCompareCartesian'
  ]
};

const defaultTrace = {
  type: 'scatter',
  textposition: "middle right",
  hoverinfo: "text",
  marker: {size: 10}
};

exports.run = function(opts) {
  if (opts.coords === undefined) {
    throw new Error('no coords supplied to mdsvis.run');
  }

  if (opts.el === undefined) {
    throw new Error('no root div supplied to mdsvis.run');
  }

  rootDiv = opts.el;

  var coords = opts.coords;
  var ndim = coords[0].length;

  // has any metadata been supplied?
  var metadata = {};
  if (opts.metadata !== undefined) {
    metadata = opts.metadata;
    metadataSupplied = true;
  }

  layout = defaultLayout;
  if (opts.layout !== undefined) {
    layout = utils.merge(layout, opts.layout);
  }

  configOptions = defaultConfig;
  if (opts.configOptions !== undefined) {
    configOptions = utils.merge(configOptions, opts.configOptions);
  }

  traceConfig = defaultTrace;
  if (opts.traceConfig !== undefined) {
    traceConfig = utils.merge(traceConfig, opts.traceConfig);
  }

  plotDiv = document.createElement('div');
  plotDiv.setAttribute('class', 'mdsvis-plot');
  rootDiv.appendChild(plotDiv);

  var menuBar = createMenuBar(ndim, metadata);
  rootDiv.appendChild(menuBar);

  onClick = opts.onClick;
  onHover = opts.onHover;
  onUnhover = opts.onUnhover;

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

  var pts = getPoints(allData);

  Plotly.newPlot(plotDiv, pts, layout, configOptions);

  // attach callbacks
  if (onClick !== undefined) {
    plotDiv.on('plotly_click', onClick);
  }
  if (onHover !== undefined) {
    plotDiv.on('plotly_hover', onHover);
  }
  if (onUnhover !== undefined) {
    plotDiv.on('plotly_unhover', onUnhover);
  }
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

  var traceData = {x: xPoints,
                   y: yPoints,
                   mode: showLabels ? 'markers+text' : 'markers',
                   name: groupname + " (" + xPoints.length + ")",
                   text: groupname
                  };

  return _.extend(traceData, traceConfig);
};

var createMenuBar = function(ndim, metadata) {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar');
  container.style.width = layout.width;

  var leftDiv = document.createElement('div');
  leftDiv.setAttribute('id', 'mdsvis-menubar-left');
  leftDiv.setAttribute('class', 'mdsvis-menubar-section');
  leftDiv.appendChild(createDimSelector(ndim));

  if (metadataSupplied) {
    leftDiv.appendChild(createGroupSelector(getGroups(metadata)));
  }

  container.appendChild(leftDiv);

  var centreDiv = document.createElement('div');
  centreDiv.setAttribute('id', 'mdsvis-menubar-centre');
  centreDiv.setAttribute('class', 'mdsvis-menubar-section');
  centreDiv.appendChild(createShowLabelsTextbox());
  container.appendChild(centreDiv);

  var rightDiv = document.createElement('div');
  rightDiv.setAttribute('id', 'mdsvis-menubar-right');
  rightDiv.setAttribute('class', 'mdsvis-menubar-section');
  rightDiv.appendChild(createShowHideButtons());
  container.appendChild(rightDiv);

  return container;
};

var createDimSelector = function(ndim) {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-dimselector');

  var label = document.createElement('div');
  label.innerHTML = 'Dimensions';
  label.setAttribute('id', 'mdsvis-menubar-dimselector-label');
  label.setAttribute('class', 'mdsvis-menubar-label');

  // pairs of dimension indices, from 1 to ndim
  var pairs = dimensionPairs(ndim);
  var selector = createSelector(pairs);
  selector.setAttribute('id', 'mdsvis-menubar-dimselector-selector');
  selector.setAttribute('class', 'mdsvis-menubar-control');

  selector.addEventListener('change', function() {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    xDim = pair[0]-1;
    yDim = pair[1]-1;
    updatePlot();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
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
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('id', 'mdsvis-menubar-groupselector-label');
  label.setAttribute('class', 'mdsvis-menubar-label');

  var selector = createSelector(groups);
  selector.setAttribute('id', 'mdsvis-menubar-groupselector-selector');
  selector.setAttribute('class', 'mdsvis-menubar-control');

  selector.addEventListener('change', function() {
    groupByKey = JSON.parse(selector.options[selector.selectedIndex].value);
    updatePlot();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
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
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-showlabels');

  var label = document.createElement('div');
  label.innerHTML = 'Show labels';
  label.setAttribute('id', 'mdsvis-menubar-showlabels-label');
  label.setAttribute('class', 'mdsvis-menubar-label');

  var checkbox = document.createElement('input');
  checkbox.setAttribute('type', 'checkbox');
  checkbox.setAttribute('id', 'mdsvis-menubar-showlabels-checkbox');
  checkbox.setAttribute('class', 'mdsvis-menubar-control');

  checkbox.addEventListener('change', function() {
    if (checkbox.checked) {
      showLabels = true;
    } else {
      showLabels = false;
    }
    updatePlot();
  });

  container.appendChild(label);
  container.appendChild(checkbox);

  return container;
};

var createShowHideButtons = function() {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-showhideall');

  var showAll = document.createElement('button');
  showAll.setAttribute('id', 'mdsvis-menubar-showall-button');
  showAll.innerHTML = 'Show all';
  showAll.addEventListener('click', () => {
    Plotly.restyle(plotDiv, 'visible', true);
  });

  var hideAll = document.createElement('button');
  hideAll.setAttribute('id', 'mdsvis-menubar-hideall-button');
  hideAll.innerHTML = 'Hide all';
  hideAll.addEventListener('click', () => {
    Plotly.restyle(plotDiv, 'visible', 'legendonly');
  });

  container.appendChild(showAll);
  container.appendChild(hideAll);

  return container;
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

exports.hoverGroup = function(groupNumber) {
  var trace = plotDiv.data[groupNumber];

  var pts = [];
  for (var i=0; i < trace.x.length; i++) {
    pts.push({curveNumber: groupNumber, pointNumber: i});
  }

  Plotly.Fx.hover(plotDiv, pts);
};

exports.highlightGroup = function(groupNumber) {
  Plotly.restyle(plotDiv, {opacity: 0.3});
  Plotly.restyle(plotDiv, {opacity: 1}, groupNumber);
};

exports.unhighlight = function() {
  Plotly.restyle(plotDiv, {opacity: 1});
};

module.exports = exports;
