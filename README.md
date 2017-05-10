# biojs-vis-mds

[![NPM version](http://img.shields.io/npm/v/biojs-vis-mds.svg)](https://www.npmjs.org/package/biojs-vis-mds) 


> Visualise multidimensional scaling (MDS) data, two dimensions at a time

Multidimensional scaling (MDS) is an algorithm for generating n-dimensional
coordinates from distance/similarity data. It was first proposed in the
following paper:

```
Torgerson, Warren S. "Multidimensional scaling: I. Theory and method."
Psychometrika 17, no. 4 (1952): 401-419.
```

This package uses Plotly.js to generate a simple visualisation for
multidimensional data. It has been designed with MDS data in mind, though in
principle it shouldn't matter exactly how you obtain your multidimensional data.


## Installation

Install the module with: `npm install biojs-vis-mds`


## Example Usage

```javascript
var rootDiv = document.createElement('div');

var mds = require('biojs-vis-mds');

// multidimensional coordinates
var coords = [ [0,1,2,3],
               [3,2,4,1],
               [2,3,1,2],
               [0,0,3,7]];

var vis = mdsvis.create(rootDiv, coords);
vis.draw();
```


## Documentation

### Methods

#### .create(el, coords, opts)

Create a new visualisation instance, contained in the DOM element `el`,
populated by the multidimensional coordinates `coords`, and configured by
options `opts` (see below for option details).

`coords` should be an array of multidimensional coordinates.

### Visualisation Options

#### metadata

An array of metadata objects corresponding to the provided coordinates.
Used to "annotate" the coordinates.

For example, suppose `coords` is `[[1,0,0],[0,1,0],[0,0,1]]`; then `metadata`
might be

    [{name: 'X', type: 'foo'},
     {name: 'Y', type: 'bar'},
     {name: 'Z', type: 'foo'}]
     
These objects should be homogeneous, since the metadata values can be used for
grouping the data and if grouping on a key which some data points don't have,
the plot behaviour is undefined.

#### xDim, yDim

Which dimensions should initially be visualised. Defaults to xDim = 1, yDim = 2.

#### showLabels

Whether data labels should initially be shown. Defaults to `false`.

#### groupByKey

Which metadata key to group by initially. Will be ignored if no metadata is
supplied. If metadata is supplied, will default to the property with the lowest
lexicographic sort value (in the example above, `name`).

#### layout, configOptions, traceConfig

Plotly configuration objects. See

https://plot.ly/javascript/reference/#layout

https://github.com/plotly/plotly.js/blob/master/src/plot_api/plot_config.js

https://plot.ly/javascript/reference/#scatter

respectively. Note that data-dependent trace configuration (properties such as
`x`, `y` and `name`) should not be set here.

#### onClick, onHover, onUnhover

Handlers for Plotly events. See below for some 'helper' handlers.

### MDSVis Class

The MDSVis class represents the visualisation. It has several methods, but
the only one you should really need to call explicitly is draw:

#### .draw()

Generate the actual visualisation. Prior to calling this function, the instance
will be initialised but nothing will have been added to the DOM. Thus you
could store MDS visualisations in a data structure until such time as you need
to `draw` them.

### Event Handlers

Handlers which execute some basic plot events, such as highlighting
a group of data. See the examples for how exactly these should be used.
If you wish to add your own handlers and aren't familiar with Plotly, copying
the implementation of these handlers is a good place to start.

#### .handlers.hoverGroup
#### .handlers.highlightGroup
#### .handlers.unhighlight


## Contributing

All contributions are welcome.


## Support

If you have any problem or suggestion please open an issue
[here](https://github.com/yoshw/biojs-vis-mds/issues).


## License 

The MIT License

Copyright (c) 2016, Yoshua Wakeham

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
