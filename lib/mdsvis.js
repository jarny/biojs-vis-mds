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
const handlers = require('./handlers');

var exports = {};

// var rootDiv;
// var plotDiv;
// var allData;
// var metadataSupplied = false;
// var groupByKey = null;
// var xDim = 0;
// var yDim = 1;
// var layout;
// var configOptions;
// var traceConfig;
// var showLabels = false;

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
    title: 'Dimension 1',
    showgrid: false,
    zeroline: true
  },
  yaxis: {
    title: 'Dimension 2',
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

  this.xDim = 0;
  this.yDim = 1;
  this.showLabels = false;

  // has any metadata been supplied?
  this.metadata = {};
  if (opts.metadata !== undefined) {
    this.metadata = opts.metadata;
    this.metadataSupplied = true;
  }

  if (this.metadataSupplied) {
    // zip the coordinates to the corresponding metadata
    this.data = _.map(_.zip(this.coords, this.metadata), function(zipped) {
      return _.extend({coord: zipped[0]}, zipped[1]);
    });

    // pick an arbitrary initial key to group on
    this.groupByKey = this.groups()[0];
  } else {
    this.data = _.map(this.coords, function(c) {
      return {coord: c};
    });
  }

  this.layout = _.clone(defaultLayout);
  this.layout.xaxis = _.clone(defaultLayout.xaxis);
  this.layout.yaxis = _.clone(defaultLayout.yaxis);
  if (opts.layout !== undefined) {
    this.layout = merge(this.layout, opts.layout);
  }

  this.configOptions = {
    modeBarButtonsToRemove: _.clone(defaultConfig.modeBarButtonsToRemove)
  };
  if (opts.configOptions !== undefined) {
    this.configOptions = merge(this.configOptions, opts.configOptions);
  }

  this.traceConfig = _.clone(defaultTrace);
  this.traceConfig.marker = _.clone(defaultTrace.marker);
  if (opts.traceConfig !== undefined) {
    this.traceConfig = merge(this.traceConfig, opts.traceConfig);
  }

  this.plotDiv = document.createElement('div');
  this.plotDiv.setAttribute('class', 'mdsvis-plot');
  this.rootDiv.appendChild(this.plotDiv);

  this.onClick = opts.onClick;
  this.onHover = opts.onHover;
  this.onUnhover = opts.onUnhover;
};

MDSVis.prototype.draw = function() {
  var pts = this.getPoints(this.data);

  Plotly.newPlot(this.plotDiv, pts, this.layout, this.configOptions);

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

  // add menu bar
  this.rootDiv.appendChild(this.createMenuBar());
};

MDSVis.prototype.getPoints = function(data) {
  var _this = this;

  var pts;
  if (this.metadataSupplied) {
    var groups = _.groupBy(data, this.groupByKey);
    pts = _.map(groups, function(group, key) {
      return _this.traceFromSampleGroup(group, key);
    });
  } else {
    pts = [this.traceFromSampleGroup(data, 'all points')];
  }
  return pts;
};

MDSVis.prototype.traceFromSampleGroup = function(data, groupname) {
  var coords = data.map(val => val.coord);

  var xPoints = coords.map(coord => coord[this.xDim]);
  var yPoints = coords.map(coord => coord[this.yDim]);

  var traceData = {x: xPoints,
                   y: yPoints,
                   mode: this.showLabels ? 'markers+text' : 'markers',
                   name: groupname + " (" + xPoints.length + ")",
                   text: groupname
                  };

  return _.extend(traceData, this.traceConfig);
};

MDSVis.prototype.createMenuBar = function() {
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar');
  container.style.width = this.layout.width;

  var leftDiv = document.createElement('div');
  leftDiv.setAttribute('class', 'mdsvis-menubar-section');
  leftDiv.className += ' mdsvis-menubar-left';
  leftDiv.appendChild(this.createDimSelector());

  if (this.metadataSupplied) {
    leftDiv.appendChild(this.createGroupSelector());
  }

  container.appendChild(leftDiv);

  var centreDiv = document.createElement('div');
  centreDiv.setAttribute('class', 'mdsvis-menubar-section');
  centreDiv.className += ' mdsvis-menubar-centre';
  centreDiv.appendChild(this.createShowLabelsCheckbox());
  container.appendChild(centreDiv);

  var rightDiv = document.createElement('div');
  rightDiv.setAttribute('class', 'mdsvis-menubar-section');
  rightDiv.className += ' mdsvis-menubar-right';
  rightDiv.appendChild(this.createShowHideButtons());
  container.appendChild(rightDiv);

  return container;
};

MDSVis.prototype.createDimSelector = function() {
  var _this = this;

  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-dimselector');

  var label = document.createElement('div');
  label.innerHTML = 'Dimensions';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-dimselector-label';

  // pairs of dimension indices, from 1 to ndim
  var pairs = dimensionPairs(this.ndim);
  var selector = createSelector(pairs);
  selector.setAttribute('class', 'mdsvis-menubar-control');
  selector.className += ' mdsvis-menubar-dimselector-selector';

  selector.addEventListener('change', function() {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    _this.xDim = pair[0]-1;
    _this.yDim = pair[1]-1;
    _this.update();
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
  container.setAttribute('class', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-groupselector-label';

  var selector = createSelector(this.groups());
  selector.setAttribute('class', 'mdsvis-menubar-control');
  selector.className += ' mdsvis-menubar-groupselector-selector';

  selector.addEventListener('change', function() {
    this.groupByKey = JSON.parse(selector.options[selector.selectedIndex].value);
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
  var _this = this;
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-showlabels');

  var label = document.createElement('div');
  label.innerHTML = 'Show labels';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-showlabels-label';

  var checkbox = document.createElement('input');
  checkbox.setAttribute('type', 'checkbox');
  checkbox.setAttribute('class', 'mdsvis-menubar-control');
  checkbox.className += ' mdsvis-menubar-showlabels-checkbox';

  checkbox.addEventListener('change', function() {
    if (checkbox.checked) {
      _this.showLabels = true;
    } else {
      _this.showLabels = false;
    }
    _this.update();
  });

  container.appendChild(label);
  container.appendChild(checkbox);

  return container;
};

MDSVis.prototype.createShowHideButtons = function() {
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-showhideall');

  var showAll = document.createElement('button');
  showAll.setAttribute('class', 'mdsvis-menubar-showall-button');
  showAll.innerHTML = 'Show all';
  showAll.addEventListener('click', () => {
    Plotly.restyle(this.plotDiv, 'visible', true);
  });

  var hideAll = document.createElement('button');
  hideAll.setAttribute('class', 'mdsvis-menubar-hideall-button');
  hideAll.innerHTML = 'Hide all';
  hideAll.addEventListener('click', () => {
    Plotly.restyle(this.plotDiv, 'visible', 'legendonly');
  });

  container.appendChild(showAll);
  container.appendChild(hideAll);

  return container;
};

MDSVis.prototype.update = function() {
  this.plotDiv.data = this.getPoints(this.data);
  this.layout.xaxis.title = "Dimension " + (this.xDim+1);
  this.layout.yaxis.title = "Dimension " + (this.yDim+1);
  this.plotDiv.layout = this.layout;
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

exports.create = function(el, opts) {
  return new MDSVis(el, opts);
};

exports.mds = mds.mds;
exports.handlers = handlers;

module.exports = exports;
