/*
 * biojs-vis-mds
 * https://github.com/yoshw/biojs-vis-mds
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */

/**
@class biojsvismds
 */


var  biojsvismds;
module.exports = biojsvismds = function(opts){
  this.el = opts.el;
  this.el.textContent = biojsvismds.hello(opts.text);
};

/**
 * Private Methods
 */

/*
 * Public Methods
 */

/**
 * Method responsible to say Hello
 *
 * @example
 *
 *     biojsvismds.hello('biojs');
 *
 * @method hello
 * @param {String} name Name of a person
 * @return {String} Returns hello name
 */


biojsvismds.hello = function (name) {

  return 'hello ' + name;
};

