/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */
'use strict';

// external dependencies
const Plotly = require('plotly.js/lib/index-basic');
const _ = require('underscore');

// internal dependencies
const mds = require('biojs-algo-mds');
const merge = require('./utils').merge;

var exports = {};

// var rootDiv;
var plotDiv;
var allData;
// var metadataSupplied = false;
var groupByKey = null;
var xDim = 0;
var yDim = 1;
var layout;
var configOptions;
var traceConfig;
var showLabels = false;

// callbacks
// var onClick;
// var onHover;
// var onUnhover;

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

var MDSVis = function(el, opts) {
  if (opts.coords === undefined) {
    throw new Error('no coords supplied');
  }
  if (el === undefined) {
    throw new Error('no root div supplied');
  }

  this.rootDiv = el;

  this.coords = opts.coords;
  this.ndim = this.coords[0].length;

  // has any metadata been supplied?
  this.metadata = {};
  if (opts.metadata !== undefined) {
    this.metadata = opts.metadata;
    this.metadataSupplied = true;
  }

  layout = defaultLayout;
  if (opts.layout !== undefined) {
    layout = merge(layout, opts.layout);
  }

  configOptions = defaultConfig;
  if (opts.configOptions !== undefined) {
    configOptions = merge(configOptions, opts.configOptions);
  }

  traceConfig = defaultTrace;
  if (opts.traceConfig !== undefined) {
    traceConfig = merge(traceConfig, opts.traceConfig);
  }

  this.plotDiv = document.createElement('div');
  this.plotDiv.setAttribute('class', 'mdsvis-plot');
  this.rootDiv.appendChild(this.plotDiv);

  this.rootDiv.appendChild(this.createMenuBar());

  this.onClick = opts.onClick;
  this.onHover = opts.onHover;
  this.onUnhover = opts.onUnhover;
};

MDSVis.prototype.draw = function() {
  if (this.metadataSupplied) {
    // zip the coordinates to the corresponding metadata
    allData = _.map(_.zip(this.coords, this.metadata), function(zipped) {
      return _.extend({coord: zipped[0]}, zipped[1]);
    });

    // pick an arbitrary initial key to group on
    groupByKey = this.groups()[0];
  } else {
    allData = _.map(this.coords, function(c) {
      return {coord: c};
    });
  }

  var pts = this.getPoints(allData);

  Plotly.newPlot(this.plotDiv, pts, layout, configOptions);

  // attach callbacks
  if (this.onClick !== undefined) {
    this.plotDiv.on('plotly_click', this.onClick);
  }
  if (this.onHover !== undefined) {
    this.plotDiv.on('plotly_hover', this.onHover);
  }
  if (this.onUnhover !== undefined) {
    this.plotDiv.on('plotly_unhover', this.onUnhover);
  }
};

MDSVis.prototype.getPoints = function(data) {
  var pts;
  if (this.metadataSupplied) {
    var groups = _.groupBy(data, groupByKey);
    pts = _.map(groups, function(group, key) {
      return traceFromSampleGroup(group, key);
    });
  } else {
    pts = [traceFromSampleGroup(data, 'all points')];
  }
  return pts;
};

var traceFromSampleGroup = function(data, groupname) {
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

MDSVis.prototype.createMenuBar = function() {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar');
  container.style.width = layout.width;

  var leftDiv = document.createElement('div');
  leftDiv.setAttribute('id', 'mdsvis-menubar-left');
  leftDiv.setAttribute('class', 'mdsvis-menubar-section');
  leftDiv.appendChild(this.createDimSelector());

  if (this.metadataSupplied) {
    leftDiv.appendChild(this.createGroupSelector());
  }

  container.appendChild(leftDiv);

  var centreDiv = document.createElement('div');
  centreDiv.setAttribute('id', 'mdsvis-menubar-centre');
  centreDiv.setAttribute('class', 'mdsvis-menubar-section');
  centreDiv.appendChild(this.createShowLabelsCheckbox());
  container.appendChild(centreDiv);

  var rightDiv = document.createElement('div');
  rightDiv.setAttribute('id', 'mdsvis-menubar-right');
  rightDiv.setAttribute('class', 'mdsvis-menubar-section');
  rightDiv.appendChild(this.createShowHideButtons());
  container.appendChild(rightDiv);

  return container;
};

MDSVis.prototype.createDimSelector = function() {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-dimselector');

  var label = document.createElement('div');
  label.innerHTML = 'Dimensions';
  label.setAttribute('id', 'mdsvis-menubar-dimselector-label');
  label.setAttribute('class', 'mdsvis-menubar-label');

  // pairs of dimension indices, from 1 to ndim
  var pairs = dimensionPairs(this.ndim);
  var selector = createSelector(pairs);
  selector.setAttribute('id', 'mdsvis-menubar-dimselector-selector');
  selector.setAttribute('class', 'mdsvis-menubar-control');

  selector.addEventListener('change', function() {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    xDim = pair[0]-1;
    yDim = pair[1]-1;
    this.update();
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

MDSVis.prototype.createGroupSelector = function() {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('id', 'mdsvis-menubar-groupselector-label');
  label.setAttribute('class', 'mdsvis-menubar-label');

  var selector = createSelector(this.groups());
  selector.setAttribute('id', 'mdsvis-menubar-groupselector-selector');
  selector.setAttribute('class', 'mdsvis-menubar-control');

  selector.addEventListener('change', function() {
    groupByKey = JSON.parse(selector.options[selector.selectedIndex].value);
    this.update();
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

MDSVis.prototype.createShowLabelsCheckbox = function() {
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
    this.update();
  });

  container.appendChild(label);
  container.appendChild(checkbox);

  return container;
};

MDSVis.prototype.createShowHideButtons = function() {
  var container = document.createElement('div');
  container.setAttribute('id', 'mdsvis-menubar-showhideall');

  var showAll = document.createElement('button');
  showAll.setAttribute('id', 'mdsvis-menubar-showall-button');
  showAll.innerHTML = 'Show all';
  showAll.addEventListener('click', () => {
    Plotly.restyle(this.plotDiv, 'visible', true);
  });

  var hideAll = document.createElement('button');
  hideAll.setAttribute('id', 'mdsvis-menubar-hideall-button');
  hideAll.innerHTML = 'Hide all';
  hideAll.addEventListener('click', () => {
    Plotly.restyle(this.plotDiv, 'visible', 'legendonly');
  });

  container.appendChild(showAll);
  container.appendChild(hideAll);

  return container;
};

MDSVis.prototype.update = function() {
  this.plotDiv.data = this.getPoints(allData);
  this.plotDiv.layout.xaxis.title = "Dimension " + (xDim+1);
  this.plotDiv.layout.yaxis.title = "Dimension " + (yDim+1);
  Plotly.redraw(this.plotDiv);
};

MDSVis.prototype.groups = function() {
  if (!this.metadataSupplied) {
    return [];
  }

  var groups = [];
  var instance = this.metadata[0];
  for (var key in instance) {
    if (instance.hasOwnProperty(key)) {
      groups.push(key);
    }
  }
  return groups.sort();
};

exports.hoverGroup = function(rootDiv, groupNumber) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  var trace = plotDiv.data[groupNumber];

  var pts = [];
  for (var i=0; i < trace.x.length; i++) {
    pts.push({curveNumber: groupNumber, pointNumber: i});
  }

  Plotly.Fx.hover(plotDiv, pts);
};

exports.highlightGroup = function(rootDiv, groupNumber) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  Plotly.restyle(plotDiv, {opacity: 0.3});
  Plotly.restyle(plotDiv, {opacity: 1}, groupNumber);
};

exports.unhighlight = function(rootDiv) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  Plotly.restyle(plotDiv, {opacity: 1});
};

exports.create = function(el, opts) {
  return new MDSVis(el, opts);
};

exports.mds = mds.mds;

module.exports = exports;
