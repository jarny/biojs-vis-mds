var exports = {};

// from stackoverflow.com/questions/12534238
exports.merge = function(obj/*, …*/) {
  for (var i=1; i<arguments.length; i++) {
    for (var prop in arguments[i]) {
      var val = arguments[i][prop];
      if (typeof val == "object") // this also applies to arrays or null!
        merge(obj[prop], val);
      else
        obj[prop] = val;
    }
  }
  return obj;
};

module.exports = exports;
