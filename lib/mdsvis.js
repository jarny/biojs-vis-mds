/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */
'use strict';

//var mds = require("biojs-algo-mds").mds;
var Plotly = require('plotly.js/lib/index-basic');
var _ = require('underscore');

var exports = {};

var graphDiv;
var coords;
var metadata;
var groupByKey = null;
var xDim = 1;
var yDim = 2;

exports.run = function(opts) {
  if (opts.coords === undefined) {
    throw new Error('no coords supplied to mdsvis.run');
  }

  if (opts.el === undefined) {
    throw new Error('no root div supplied to mdsvis.run');
  }

  graphDiv = opts.el;

  coords = opts.coords;

  // has any metadata been supplied?
  metadata = opts.metadata !== undefined ? opts.metadata : {};

  init();
};

var init = function() {
  var data;

  if (metadata !== {}) {
    data = _.map(_.zip(coords, metadata), function(zipped) {
      return _.extend({coord:zipped[0]}, zipped[1]);
    });

    // pick an arbitrary initial key to group on
    // metadata[0] is metadata obj for first coord; we just grab the first key
    groupByKey = _.keys(metadata[0])[0];

    data = _.groupBy(data, groupByKey);
  } else {
    data = _.map(coords, function(c) {
      return {coord: c};
    });
  }

  console.log(data);
  // Plotly.plot();
};

module.exports = exports;
