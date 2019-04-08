function createLib (execlib, ImageRegistry, jobondestroyablelib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  var ZipFetchingAndUnpackingJob = require('./jobs')(lib, jobondestroyablelib);

  function ZipImageRegistry (filename2imageanimationframefunc) {
    if (!lib.isFunction(filename2imageanimationframefunc)) {
      throw new Error('ZipImageRegistry needs a filename2imageanimationframefunc function in constructor');
    }
    ImageRegistry.call(this);
    this.filename2imageanimationframefunc = filename2imageanimationframefunc;
  }
  lib.inherit(ZipImageRegistry, ImageRegistry);
  ZipImageRegistry.prototype.__cleanUp = function () {
    this.filename2imageanimationframefunc = null;
    ImageRegistry.prototype.__cleanUp.call(this);
  };

  ZipImageRegistry.prototype.load = function (path) {
    return (new ZipFetchingAndUnpackingJob(path, this)).go();
  };

  return ZipImageRegistry;
}

module.exports = createLib;  
