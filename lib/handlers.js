/* jshint esversion: 6 */
const Plotly = require('plotly.js/lib/index-basic');

var exports = {};

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

module.exports = exports;
