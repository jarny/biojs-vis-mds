/*
 * Utility functions for Multidimensional Scaling (MDS) 2D Visualisation.
 *
 * Copyright (c) 2016 Yoshua Wakeham
 * Licensed under the MIT license.
 */

/* jshint esversion: 6 */
'use strict';

/**
  * Recursively merge two objects with nested structure.
  *
  * Unlike _.extend and similar functions, this function will recursively
  * merge objects with arbitrarily nested properties. For example,
  *
  *     > merge({a: 1, b: {foo: 2, baz: 3}}, {c: 4, b: {foo: 5}})
  *     { a: 1, b: { foo: 5, baz: 3 }, c: 4 }
  *
  * The code is adapted from stackoverflow.com/questions/12534238.
  */
function merge(obj/*, …*/) {
  for (var i=1; i<arguments.length; i++) {
    for (var prop in arguments[i]) {
      var val = arguments[i][prop];
      var valIsObject = val && typeof val === 'object' &&
          val.constructor === Object;
      var objPropIsObject = obj[prop] && typeof obj[prop] === 'object' &&
          obj[prop].constructor === Object;
      if (valIsObject && objPropIsObject) {
        merge(obj[prop], val);
      } else if (valIsObject){
        obj[prop] = {};
        merge(obj[prop], val);
      } else {
        obj[prop] = val;
      }
    }
  }
  return obj;
}

// exports
module.exports.merge = merge;
