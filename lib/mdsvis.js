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

// plot config defaults
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

/**
  * @class MDSVis
  */
var MDSVis = function(el, opts) {
  if (el === undefined) {
    throw new Error('no root div supplied (mdsvis.create)');
  }
  this.rootDiv = el;

  if (opts.coords === undefined) {
    throw new Error('no coords supplied (mdsvis.create)');
  }
  this.coords = opts.coords;

  // establish dimensions
  this.ndim = this.coords[0].length;

  this.xDim = 1;
  this.yDim = 2;
  if (opts.xDim !== undefined && opts.yDim !== undefined) {
    // get all valid dimension pairs
    var validDims = dimensionPairs(this.ndim);
    var validDimStrings = _.map(validDims, JSON.stringify);
    var candidate = JSON.stringify([opts.xDim, opts.yDim]);
    if (validDimStrings.indexOf(candidate) === -1) {
      throw new Error('invalid xDim,yDim pair supplied (mdsvis.create)');
    } else {
      this.xDim = opts.xDim;
      this.yDim = opts.yDim;
    }
  } else if (opts.xDim !== undefined || opts.yDim !== undefined) {
    throw new Error('only one of xDim or yDim supplied (mdsvis.create)');
  }

  // labels are hidden by default
  this.showLabels = false;
  if (opts.showLabels !== undefined) {
    this.showLabels = opts.showLabels;
  }

  // check for metadata, and convert coords into 'record' format
  // i.e. [{coord: [1,1,1,1], foo: bar, fooey: baz, ...}, {...}, ...]
  this.metadata = {};
  if (opts.metadata !== undefined) {
    this.metadata = opts.metadata;
    this.metadataSupplied = true;

    // zip the MDS coordinates with corresponding metadata
    this.data = _.map(_.zip(this.coords, this.metadata), function(pair) {
      // pair[0] is the coordinate, pair[1] the metadata object
      return _.extend({coord: pair[0]}, pair[1]);
    });

    // set default grouping
    this.groupByKey = this.getGroupNames()[0];
    if (opts.groupByKey !== undefined) {
      this.groupByKey = opts.groupByKey;
    }
  } else {
    // no metadata supplied - just convert array of arrays to array of objects
    this.data = _.map(this.coords, function(c) {
      return {coord: c};
    });
  }

  // clone default layout, and merge with any layout provided in options
  this.layout = _.clone(defaultLayout);
  this.layout.xaxis = _.clone(defaultLayout.xaxis);
  this.layout.yaxis = _.clone(defaultLayout.yaxis);
  if (opts.layout !== undefined) {
    this.layout = merge(this.layout, opts.layout);
  }
  // update axes titles
  this.layout.xaxis.title = "Dimension " + this.xDim;
  this.layout.yaxis.title = "Dimension " + this.yDim;

  // clone default config options, and merge with user-provided config
  this.configOptions = {
    modeBarButtonsToRemove: _.clone(defaultConfig.modeBarButtonsToRemove)
  };
  if (opts.configOptions !== undefined) {
    this.configOptions = merge(this.configOptions, opts.configOptions);
  }

  // clone default trace config, and merge with user-provided config
  this.traceConfig = _.clone(defaultTrace);
  this.traceConfig.marker = _.clone(defaultTrace.marker);
  if (opts.traceConfig !== undefined) {
    this.traceConfig = merge(this.traceConfig, opts.traceConfig);
  }

  // store ref to event handlers (which may be undefined; we'll check in draw())
  this.onClick = opts.onClick;
  this.onHover = opts.onHover;
  this.onUnhover = opts.onUnhover;
};

MDSVis.prototype.draw = function() {
  // create div to hold plot
  this.plotDiv = document.createElement('div');
  this.plotDiv.setAttribute('class', 'mdsvis-plot');
  this.rootDiv.appendChild(this.plotDiv);

  // create menu bar and add to DOM
  this.rootDiv.appendChild(this.createMenuBar());

  // create plot
  var traces = this.getTraces();
  Plotly.newPlot(this.plotDiv, traces, this.layout, this.configOptions);

  // attach callbacks to plot
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

MDSVis.prototype.getTraces = function() {
  var _this = this;

  var traces;
  if (this.metadataSupplied) {
    var groups = _.groupBy(this.data, this.groupByKey);
    traces = _.map(groups, function(group, key) {
      return _this.traceFromGroup(group, key);
    });
  } else {
    traces = [this.traceFromGroup(this.data, 'all')];
  }

  return traces;
};

MDSVis.prototype.traceFromGroup = function(data, groupname) {
  var xPoints = data.map(val => val.coord[this.xDim-1]);
  var yPoints = data.map(val => val.coord[this.yDim-1]);

  var trace = {x: xPoints,
               y: yPoints,
               mode: this.showLabels ? 'markers+text' : 'markers',
               name: groupname + " (" + xPoints.length + ")",
               text: groupname
              };

  // extend with trace configuration
  _.extend(trace, this.traceConfig);

  return trace;
};

/**
  * These names are fixed, so we implement them as a closure to ensure
  * they are only computed once.
  */
MDSVis.prototype.getGroupNames = (function() {
  var groups = null;

  var getGroups = function() {
    if (groups !== null) {
      return groups;
    }

    // compute the group names
    groups = [];
    if (this.metadataSupplied) {
      var record = this.metadata[0];
      for (var key in record) {
        if (record.hasOwnProperty(key)) {
          groups.push(key);
        }
      }
      groups.sort();
    }
    return groups;
  };
  return getGroups;
}());

MDSVis.prototype.update = function() {
  // update traces
  this.plotDiv.data = this.getTraces();
  // update axis titles
  this.layout.xaxis.title = "Dimension " + this.xDim;
  this.layout.yaxis.title = "Dimension " + this.yDim;
  this.plotDiv.layout = this.layout;

  Plotly.redraw(this.plotDiv);
};

// DOM creation code

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
  var initial = [this.xDim, this.yDim];
  var selector = createSelector(pairs, initial);
  selector.setAttribute('class', 'mdsvis-menubar-control');
  selector.className += ' mdsvis-menubar-dimselector-selector';

  selector.addEventListener('change', function() {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    _this.xDim = pair[0];
    _this.yDim = pair[1];
    _this.update();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
};

MDSVis.prototype.createGroupSelector = function() {
  var _this = this;

  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-groupselector-label';

  var selector = createSelector(this.getGroupNames(), this.groupByKey);
  selector.setAttribute('class', 'mdsvis-menubar-control');
  selector.className += ' mdsvis-menubar-groupselector-selector';

  selector.addEventListener('change', function() {
    _this.groupByKey = JSON.parse(selector.options[selector.selectedIndex].value);
    _this.update();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
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
  if (this.showLabels) {
    checkbox.setAttribute('checked', '');
  }

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
  var _this = this;
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-showhideall');

  var showAll = document.createElement('button');
  showAll.setAttribute('class', 'mdsvis-menubar-showall-button');
  showAll.innerHTML = 'Show all';
  showAll.addEventListener('click', () => {
    Plotly.restyle(_this.plotDiv, 'visible', true);
  });

  var hideAll = document.createElement('button');
  hideAll.setAttribute('class', 'mdsvis-menubar-hideall-button');
  hideAll.innerHTML = 'Hide all';
  hideAll.addEventListener('click', () => {
    Plotly.restyle(_this.plotDiv, 'visible', 'legendonly');
  });

  container.appendChild(showAll);
  container.appendChild(hideAll);

  return container;
};

function createSelector(opts, initial) {
  var selector = document.createElement('select');

  _.each(opts, function(val) {
    var opt = document.createElement('option');
    opt.value = JSON.stringify(val);
    opt.innerHTML = val.toString();
    if (opt.value === JSON.stringify(initial)) {
      opt.setAttribute('selected', '');
    }
    selector.appendChild(opt);
  });

  return selector;
};

function dimensionPairs(ndim) {
  var pairs = [];

  for (var i=1; i<=ndim; i++) {
    for (var j=i+1; j <=ndim; j++) {
      pairs.push([i,j]);
    }
  }

  return pairs;
};


exports.create = function(el, opts) {
  return new MDSVis(el, opts);
};

exports.mds = mds.mds;
exports.handlers = handlers;

module.exports = exports;
