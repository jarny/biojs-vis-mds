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
//const mds = require('biojs-algo-mds');
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
 * be grouped. By default, that will just be the property with the lowest
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
  this.groupByKey = this.getGroupByKeys()[0];
  if (_groupByKey !== undefined) {
    this.groupByKey = _groupByKey;
  }
};

/**
 * Initialise plot layout and configuration.
 *
 * There are three facets to configuring the Plotly visualisation: the
 * overall plot layout configuration, miscellaneous configuration not related
 * to plot layout, and the configuration of the data 'traces' themselves.
 *
 * This module provides default configuration for all three, but users can
 * add/override the configuration as they choose. The layout and config objects
 * are passed directly to Plotly, so all Plotly objects should be respected.
 *
 * @param {object} _layout        - an object storing Plotly layout config
 * @param {object} _configOptions - an object storing misc Plotly config options
 * @param {object} _traceConfig   - an object storing Plotly trace config
 */
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

/**
 * Initialise plot event handlers.
 *
 * This function just sets the event handler properties of the instance.
 * Plotly event handlers cannot be attached until after the plot has actually
 * been created, so we don't attempt to attach these handlers until draw() is
 * called for the first time.
 *
 * @param {function} _onClick   - click event handler
 * @param {function} _onHover   - hover event handler
 * @param {function} _onUnhover - unhover event handler
 */
MDSVis.prototype.initEventHandlers = function(_onClick, _onHover, _onUnhover) {
  // store event handlers
  // (they may be undefined; we'll check in draw())
  this.onClick = _onClick;
  this.onHover = _onHover;
  this.onUnhover = _onUnhover;
};

/**
  * Generate the Plotly visualisation.
  *
  * This method actually generates the Plotly visualisation of the MDS data,
  * using the options supplied at construction time. It also attaches event
  * handlers to the Plotly plot, if any handlers were provided.
  *
  * Suppose that at construction time, this.rootDiv was an empty div with
  * id 'myRoot'. Prior to calling this function, the div will still be empty.
  * After calling this function, that section of the dom will look like
  *
  * <div id='myRoot'>
  *   <div class='mdsvis-plot js-plotly-plot'>
  *     (Plotly plot)
  *   </div>
  *   <div class='mdsvis-menubar'>
  *     (menu bar ... see `createMenuBar` for details)
  *   </div>
  * </div>
  */
MDSVis.prototype.draw = function() {
  // create div to hold plot
  this.plotDiv = document.createElement('div');
  this.plotDiv.setAttribute('class', 'mdsvis-plot');
  this.rootDiv.appendChild(this.plotDiv);

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

  // create and append menu bar
  this.rootDiv.appendChild(this.createMenuBar());
};

/**
  * Get Plotly traces corresponding to this instance's data.
  *
  * Get the Plotly traces (data objects) for this visualisation. If metadata
  * was supplied at construction time, there will be one Plotly trace for each
  * group of data. Otherwise there will be only one trace, containing all data.
  *
  * This function is also responsible for extracting the required dimensions
  * from the multidimensional data.
  *
  * @returns {array} An array of Plotly trace objects
  */
MDSVis.prototype.getTraces = function() {
  var traces;

  if (this.metadataSupplied) {
    // group the data
    var groups = _.groupBy(this.data, this.groupByKey);
    // convert groups to traces
    traces = _.map(groups, (group, key) => {
      return this.traceFromGroup(group, key);
    });
  } else {
    traces = [this.traceFromGroup(this.data, 'data')];
  }

  return traces;
};

/**
  * Get a Plotly trace corresponding to one data group.
  *
  * If the user has supplied metadata, the data associated with this instance
  * will naturally fall into multiple groups. This function is responsible for
  * converting a _single_ data group into a single Plotly trace.
  *
  * @param {array}  data       - The array of data objects from which to
  *                              generate a trace
  * @param {string} groupbyval - The group value (i.e. value for groupByKey) to
  *                              associate with this trace
  * @returns {object} A Plotly trace object
  */
MDSVis.prototype.traceFromGroup = function(data, groupbyval) {
  // extract the two dimensions we'll visualise
  // note that xDim and yDim are 1-offset, so we need to subtract one
  var xPoints = data.map(val => val.coord[this.xDim-1]);
  var yPoints = data.map(val => val.coord[this.yDim-1]);

  // specify data-specific trace properties
  var trace = {x: xPoints,
               y: yPoints,
               mode: this.showLabels ? 'markers+text' : 'markers',
               name: groupbyval + ' (' + xPoints.length + ')',
               text: groupbyval
              };

  // merge with general trace configuration
  _.extend(trace, this.traceConfig);

  return trace;
};

/**
  * Get the possible keys on which the data can be grouped.
  *
  * Get an array of the metadata properties, which can then be used as keys
  * for grouping the data. Since these names are fixed at construction time,
  * we use memoisation to ensure the array is only computed once.
  *
  * @returns An array of possible grouping keys (property names) 
  */
MDSVis.prototype.getGroupByKeys = (function() {
  var keys = null;

  // nested function, that will only compute
  // keys if they haven't already been computed
  var getKeys = function() {
    if (keys === null) {
      // compute the group names
      keys = [];
      if (this.metadataSupplied) {
        var record = this.metadata[0];
        keys = Object.keys(record);
        keys.sort();
      }
    }
    return keys;
  };

  return getKeys;
}());

/**
  * Update the Plotly visualisation.
  *
  * This method totally redraws the plot, allowing for arbitrary changes to data
  * and plot layout/config. In practice, this is called whenever the user
  * interacts with the plot in the browser.
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
  * The menu bar is pretty simple. It has the following HTML structure:
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
  *
  * @returns {object} The root div of the menu bar
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
 * Create the dimension selector.
 *
 * The dimension selector is the dropdown for selecting the pair of dimensions
 * to visualise. It has the following HTML structure:
 *
 * <div class='mdsvis-menubar-dimselector'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-dimselector-label'>
 *     Dimensions
 *   </div>
 *   <select class='mdsvis-menubar-control mdsvis-dimselector-selector'>
 *     (options)
 *   </div>
 * </div>
 *
 * @returns {object} The root div of the dimension selector
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
 * Create the group selector.
 *
 * The group selector is the dropdown for selecting which key to group by.
 * It has the following HTML structure:
 *
 * <div class='mdsvis-menubar-groupselector'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-groupselector-label'>
 *     Group by
 *   </div>
 *   <select class='mdsvis-menubar-control mdsvis-groupselector-selector'>
 *     (options)
 *   </div>
 * </div>
 *
 * @returns {object} The root div of the group selector
 */
MDSVis.prototype.createGroupSelector = function() {
  var container = document.createElement('div');
  container.setAttribute('class', 'mdsvis-menubar-groupselector');

  var label = document.createElement('div');
  label.innerHTML = 'Group by ';
  label.setAttribute('class', 'mdsvis-menubar-label');
  label.className += ' mdsvis-menubar-groupselector-label';

  var selector = createSelector(this.getGroupByKeys(), this.groupByKey);
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
 * The checkbox element has the following HTML structure:
 *
 * <div class='mdsvis-menubar-showlabels'>
 *   <div class='mdsvis-menubar-label mdsvis-menubar-showlabels-label'>
 *     Show labels
 *   </div>
 *   <input type='checkbox'
 *          class='mdsvis-menubar-control mdsvis-showlabels-checkbox' />
 * </div>
 *
 * @returns {object} The root div of the show labels checkbox
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
 * The show/hide all element has the following HTML structure:
 *
 * <div class='mdsvis-menubar-showhideall'>
 *   <button class='mdsvis-menubar-showall-button'>
 *     Show all
 *   </button>
 *   <button class='mdsvis-menubar-hideall-button'>
 *     Hide all
 *   </button>
 * </div>
 *
 * @returns {object} The root div containing the show/hide all buttons
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

// Helper functions

/**
  * Create a dropdown selector from an array of options.
  *
  * The options need not be strings. toString is used to convert the option
  * values to strings for displaying in the dropdown, while JSON.stringify
  * is used to store the values, allowing the values to later be retrieved with
  * JSON.parse.
  *
  * The initial selection defaults to the first item in the array of options,
  * but a different initial value may be specified.
  *
  * @param {array} opts    - An array of options to list in the dropdown
  * @param         initial - The value to use as the initial selection; should
  *                          be a value contained in `opts`
  *
  * @returns {object} A dropdown element with options corresponding to `opts`
  * @throws Error if the `opts` array contains `undefined`
  */
function createSelector(opts, initial) {
  if (opts.indexOf(undefined) !== -1) {
    throw new Error('the array of dropdown options cannot include `undefined`');
  }

  var selector = document.createElement('select');

  opts.forEach((val) => {
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
  * Get array of all pairs of dimensions which can be visualised.
  *
  * First dimension (corresponding to the x axis of the visualisation) must be
  * less than second. That is, for a given pair of dimensions A and B with
  * A < B, we can have A on the x axis and B on the y axis, but not the reverse.
  *
  * For example,
  *
  *     dimensionPairs(4) => [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]
  *
  * @param ndim Number of dimensions in the data
  * @returns An array of dimension pairs, which are two-element arrays
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
//module.exports.mds = mds.mds;
module.exports.handlers = handlers;

/**
  * Wrapper function which creates a new visualisation.
  */
module.exports.create = function(el, coords, opts) {
  return new MDSVis(el, coords, opts);
};
