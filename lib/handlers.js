/*
 * Some useful event handlers for Multidimensional Scaling (MDS) visualisation.
 *
 * Note that these handlers do depend on the visualisation's implementation.
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */

/* jshint esversion: 6 */
'use strict';

const Plotly = require('plotly.js/lib/index-basic');

/**
  * Hover over all points in a Plotly trace simultaneously.
  *
  * @param {object} rootDiv     - The root element of the visualisation on which
  *                               to execute this handler.
  * @param {number} groupNumber - The id of the trace to hover over
  */
module.exports.hoverGroup = function(rootDiv, groupNumber) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  var trace = plotDiv.data[groupNumber];

  var pts = [];
  for (var i=0; i < trace.x.length; i++) {
    pts.push({curveNumber: groupNumber, pointNumber: i});
  }

  Plotly.Fx.hover(plotDiv, pts);
};

/**
 * Highlight all points in a Plotly trace (by decreasing the opacity of all
 * other traces).
 *
 * @param {object} rootDiv     - The root element of the visualisation on which
 *                               to execute this handler.
 * @param {number} groupNumber - The id of the trace to highlight
 */
module.exports.highlightGroup = function(rootDiv, groupNumber) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  Plotly.restyle(plotDiv, {opacity: 0.3});
  Plotly.restyle(plotDiv, {opacity: 1}, groupNumber);
};

/**
 * Remove any highlights from the plot (restore all trace opacities to 1).
 *
 * @param {object} rootDiv     - The root element of the visualisation on which
 *                               to execute this handler.
 */
module.exports.unhighlight = function(rootDiv) {
  var plotDiv = rootDiv.querySelector('.mdsvis-plot');
  Plotly.restyle(plotDiv, {opacity: 1});
};
