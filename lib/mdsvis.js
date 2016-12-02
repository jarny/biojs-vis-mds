/*
 * Multidimensional Scaling (MDS) 2D Visualisation.
 * Generate a scatterplot of higher-dimensional coordinates, presumed to
 * have been generated using MDS. Visualise two dimensions at a time.
 *
 * Supply metadata along with the coordinates to allow grouping
 * of the data on different properties.
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */

/* jshint browser: true, esversion: 6 */
'use strict';

// external dependencies
const Plotly = require('plotly.js/lib/index-basic');
const _ = require('underscore');

// internal dependencies
const mds = require('biojs-algo-mds');
const merge = require('./utils').merge;
const handlers = require('./handlers');

// plotly config defaults
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
  textposition: 'middle right',
  hoverinfo: 'text',
  marker: {size: 10}
};


/**
  * Constructor for main class representing an MDS visualisation.
  *
  * @param {object} el     - The root element (usually, an empty div) to hold
  *                          the visualisation
  * @param {array}  coords - The multidimensional coordinates to visualise
  * @param {object} opts   - Visualisation options. See README for more details.
  * 
  * @returns A new MDSVis object
  *
  * @throws Error If root element or coordinates are not provided.
  *
  * Class properties:
  *
  * @property {object}   rootDiv          - See `el` above
  * @property {array}    coords           - See `coords` above
  * @property {number}   ndim             - Coordinates have `ndim` dimensions
  * @property {number}   xDim             - Dimension to visualise on the x axis
  * @property {number}   yDim             - Dimension to visualise on the y axis
  * @property {bool}     showLabels       - Should labels be shown on plot?
  * @property {array}    data             - Array of objects representing the
  *                                         data points, each having at least 
  *                                         a `coord` property, and maybe also
  *                                         metadata properties
  * @property {array}    metadata         - Array of objects, each containing
  *                                         metadata properties for the
  *                                         corresponding coordinate
  * @property {bool}     metadataSupplied - Was metadata supplied at
  *                                         construction time?
  * @property {string}   groupByKey       - Metadata property on which to group
  *                                         the visualised data
  * @property {object}   layout           - Object storing Plotly layout config
  * @property {object}   configOptions    - Object storing misc Plotly config
  * @property {object}   traceConfig      - Object storing Plotly trace config
  * @property {function} onClick          - Click event handler
  * @property {function} onHover          - Hover event handler
  * @property {function} onUnhover        - Unhover event handler
  */
var MDSVis = function(el, coords, opts) {
  if (el === undefined) {
    throw new Error('no root div supplied (mdsvis.create)');
  }
  this.rootDiv = el;

  if (coords === undefined) {
    throw new Error('no coords supplied (mdsvis.create)');
  }
  this.coords = coords;
  this.ndim = this.coords[0].length;

  opts = opts || {};
  this.initDimensions(opts.xDim, opts.yDim);
  this.initShowLabels(opts.showLabels);
  this.initData(opts.metadata, opts.groupByKey);
  this.initLayoutAndConfig(opts.layout, opts.configOptions, opts.traceConfig);
  this.initEventHandlers(opts.onClick, opts.onHover, opts.onUnhover);
};

/**
 * Set dimensions to visualise initially.
 *
 * By default, xDim = 1 and yDim = 2. If the user has specified
 * a valid xDim, yDim pair in the options object, that takes precedence.
 * See README for description of valid xDim, yDim pairs.
 *
 * @param {number} _xDim - Initial dimension to visualise on x axis
 * @param {number} _yDim - Initial dimension to visualise on y axis
 *
 * @throws Error If only one of _xDim or _yDim are supplied, or if _xDim, _yDim
 *               is not a valid pair.
 */
MDSVis.prototype.initDimensions = function(_xDim, _yDim) {
  this.xDim = 1;
  this.yDim = 2;

  if (_xDim !== undefined && _yDim !== undefined) {
    // get all valid dimension pairs
    var validDims = dimensionPairs(this.ndim);
    var validDimStrings = _.map(validDims, JSON.stringify);
    var candidate = JSON.stringify([_xDim, _yDim]);
    if (validDimStrings.indexOf(candidate) === -1) {
      throw new Error('invalid xDim,yDim pair supplied (mdsvis.create)');
    } else {
      this.xDim = _xDim;
      this.yDim = _yDim;
    }
  } else if (_xDim !== undefined || _yDim !== undefined) {
    throw new Error('only one of xDim or yDim supplied (mdsvis.create)');
  }
};

/**
 * Set whether or not labels on data points should be visible initially.
 *
 * By default, data labels will not be shown.
 *
 * @param {bool} _showLabels - Should data labels be shown initially?
 */
MDSVis.prototype.initShowLabels = function(_showLabels) {
  this.showLabels = false;

  if (_showLabels !== undefined) {
    this.showLabels = _showLabels;
  }
};

/**
 * Merge coordinates and metadata, if any was supplied, and convert to 'record'
 * format. If metadata was supplied, set initial property for data grouping.
 *
 * Suppose that this.coords === [ [1,0,0], [0,1,0], [0,0,1] ].
 *
 * By default, metadata is an empty object. If no metadata is supplied, then
 * this.data will simply be an array of objects corresponding to the input
 * coordinate array, i.e.:
 *
 *     [ {coord: [1,0,0]}, {coord: [0,1,0]}, {coord: [0,0,1]} ]
 *
 * On the other hand, suppose that the user has supplied the following
 * metadata object:
 *
 *     [ {name: 'X', col: 'blue'},
 *       {name: 'Y', col: 'green'},
 *       {name: 'Z', col: 'red'} ]
 *
 * Then this function will merge the object with the coords array, and this.data
 * will be
 *
 *     [ {coord: [1,0,0], name: 'X', col: 'blue'},
 *       {coord: [0,1,0], name: 'Y', col: 'green'},
 *       {coord: [0,0,1], name: 'Z', col: 'red'}]
 *
 * In this case, we need to set the property by which the data will initially
 * be grouped. By default, that will just be the property with the smallest
 * lexicographic sort value (in this case, 'col'). But the user may also supply
 * an alternate groupByKey.
 *
 * @param {array}  _metadata   - User-supplied metadata array
 * @param {string} _groupByKey - Property by which to group data, initially
 */
MDSVis.prototype.initData = function(_metadata, _groupByKey) {
  this.metadata = {};

  if (_metadata === undefined) {
    // no metadata supplied - just convert array of arrays to array of objects
    this.data = _.map(this.coords, (c) => {return {coord: c};});
    return;
  }
  
  // we need to merge metadata and coordinates into one array of objects
  this.metadataSupplied = true;
  this.metadata = _metadata;
  
  // zip the MDS coordinates with corresponding metadata
  var zipped = _.zip(this.coords, this.metadata);

  // now, combine the objects
  this.data = _.map(zipped, (pair) => {
    return _.extend({coord: pair[0]}, pair[1]);
  });
  
  // set groupByKey
  this.groupByKey = this.getGroupNames()[0];
  if (_groupByKey !== undefined) {
    this.groupByKey = _groupByKey;
  }
};

MDSVis.prototype.initLayoutAndConfig = function(_layout, _configOptions, _traceConfig) {
  // 'deep clone' the default layout and config objects
  this.layout = JSON.parse(JSON.stringify(defaultLayout));
  this.configOptions = JSON.parse(JSON.stringify(defaultConfig));
  this.traceConfig = JSON.parse(JSON.stringify(defaultTrace));

  // update axes titles
  this.layout.xaxis.title = 'Dimension ' + this.xDim;
  this.layout.yaxis.title = 'Dimension ' + this.yDim;

  // merge in custom layout/config objects
  this.layout = merge(this.layout, _layout || {});
  this.configOptions = merge(this.configOptions, _configOptions || {});
  this.traceConfig = merge(this.traceConfig, _traceConfig || {});
};

MDSVis.prototype.initEventHandlers = function(_onClick, _onHover, _onUnhover) {
  // store event handlers
  // (they may be undefined; we'll check in draw())
  this.onClick = _onClick;
  this.onHover = _onHover;
  this.onUnhover = _onUnhover;
};

/**
  * Generate the visualisation.
  */
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

/**
  * Get Plotly traces (data points) corresponding to the data
  * associated with this visualisation instance, including the
  * current groupByKey and dimensions to visualise.
  */
MDSVis.prototype.getTraces = function() {
  var traces;
  if (this.metadataSupplied) {
    var groups = _.groupBy(this.data, this.groupByKey);
    traces = _.map(groups, (group, key) => {
      return this.traceFromGroup(group, key);
    });
  } else {
    traces = [this.traceFromGroup(this.data, 'all')];
  }

  return traces;
};

/**
  * Get a Plotly trace (set of data points) corresponding to one
  * group of data.
  */
MDSVis.prototype.traceFromGroup = function(data, groupname) {
  var xPoints = data.map(val => val.coord[this.xDim-1]);
  var yPoints = data.map(val => val.coord[this.yDim-1]);

  var trace = {x: xPoints,
               y: yPoints,
               mode: this.showLabels ? 'markers+text' : 'markers',
               name: groupname + ' (' + xPoints.length + ')',
               text: groupname
              };

  // extend with trace configuration
  _.extend(trace, this.traceConfig);

  return trace;
};

/**
  * Get the names of possible groupings for this data - namely, the different
  * metadata fields.
  *
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

/**
  * Update the visualisation.
  *
  * Totally redraws the plot, allowing for arbitrary data and layout changes.
  */
MDSVis.prototype.update = function() {
  // update traces
  this.plotDiv.data = this.getTraces();
  // update axis titles
  this.layout.xaxis.title = 'Dimension ' + this.xDim;
  this.layout.yaxis.title = 'Dimension ' + this.yDim;
  this.plotDiv.layout = this.layout;

  Plotly.redraw(this.plotDiv);
};

// DOM creation code

/**
  * Create the menu bar for the visualisation.
  *
  * <div class='mdsvis-menubar' width=$this.layout.width>
  *   <div class='mdsvis-menubar-section mdsvis-menubar-left'>
  *     (dimension selector)
  *     (group selector)
  *   </div>
  *   <div class='mdsvis-menubar-section mdsvis-menubar-centre'>
  *     (show/hide labels)
  *   </div>
  *   <div class='mdsvis-menubar-section mdsvis-menubar-right'>
  *     (show/hide all traces)
  *   </div>
  * </div>
  */
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

  if (this.metadataSupplied) {
    centreDiv.appendChild(this.createShowLabelsCheckbox());
  }

  container.appendChild(centreDiv);

  var rightDiv = document.createElement('div');
  rightDiv.setAttribute('class', 'mdsvis-menubar-section');
  rightDiv.className += ' mdsvis-menubar-right';
  rightDiv.appendChild(this.createShowHideButtons());
  container.appendChild(rightDiv);

  return container;
};

/**
 * Create the dimension selector for the visualisation.
 *
 * <div class='mdsvis-menubar-dimselector'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-dimselector-label'>
 *     Dimensions
 *   </div>
 *   <select class='mdsvis-menubar-control mdsvis-dimselector-selector'>
 *     (options)
 *   </div>
 * </div>
 */
MDSVis.prototype.createDimSelector = function() {
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

  selector.addEventListener('change', () => {
    var pair = JSON.parse(selector.options[selector.selectedIndex].value);
    this.xDim = pair[0];
    this.yDim = pair[1];
    this.update();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
};

/**
 * Create the group selector for the visualisation.
 *
 * <div class='mdsvis-menubar-groupselector'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-groupselector-label'>
 *     Group by
 *   </div>
 *   <select class='mdsvis-menubar-control mdsvis-groupselector-selector'>
 *     (options)
 *   </div>
 * </div>
 */
MDSVis.prototype.createGroupSelector = function() {
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-groupselector-label';

  var selector = createSelector(this.getGroupNames(), this.groupByKey);
  selector.setAttribute('class', 'mdsvis-menubar-control');
  selector.className += ' mdsvis-menubar-groupselector-selector';

  selector.addEventListener('change', () => {
    var selected = selector.options[selector.selectedIndex].value;
    this.groupByKey = JSON.parse(selected);
    this.update();
  });

  container.appendChild(label);
  container.appendChild(selector);

  return container;
};

/**
 * Create the checkbox for showing/hiding labels.
 *
 * <div class='mdsvis-menubar-showlabels'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-showlabels-label'>
 *     Show labels
 *   </div>
 *   <input type='checkbox'
 *          class='mdsvis-menubar-control mdsvis-showlabels-checkbox' />
 * </div>
 */
MDSVis.prototype.createShowLabelsCheckbox = function() {
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

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      this.showLabels = true;
    } else {
      this.showLabels = false;
    }
    this.update();
  });

  container.appendChild(label);
  container.appendChild(checkbox);

  return container;
};

/**
 * Create the buttons for showing/hiding all traces.
 *
 * <div class='mdsvis-menubar-showhideall'>
 *   <button class='mdsvis-menubar-showall-button'>
 *     Show all
 *   </button>
 *   <button class='mdsvis-menubar-hideall-button'>
 *     Hide all
 *   </button>
 * </div>
 */
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

// helper functions

/**
  * Create a dropdown selector from an array of options.
  *
  * Optionally specify the initial selection.
  */
function createSelector(opts, initial) {
  var selector = document.createElement('select');

  _.each(opts, (val) => {
    var opt = document.createElement('option');
    opt.value = JSON.stringify(val);
    opt.innerHTML = val.toString();
    if (opt.value === JSON.stringify(initial)) {
      opt.setAttribute('selected', '');
    }
    selector.appendChild(opt);
  });

  return selector;
}

/**
  * Generate an array of pairs of dimensions that can be visualised.
  *
  * First dimension must be less than second. That is, for any given pair of
  * dimensions, if we can visualise X-Y, cannot visualise Y-X.
  *
  * For example,
  *
  *     dimensionPairs(4) => [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]
  *
  * @param ndim Number of dimensions in the data.
  * @returns an array of arrays.
  */
function dimensionPairs(ndim) {
  var pairs = [];

  for (var i=1; i<=ndim; i++) {
    for (var j=i+1; j <=ndim; j++) {
      pairs.push([i,j]);
    }
  }

  return pairs;
}

// module exports
module.exports.mds = mds.mds;
module.exports.handlers = handlers;

module.exports.create = function(el, coords, opts) {
  return new MDSVis(el, coords, opts);
};
