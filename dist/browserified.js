(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var lR = ALLEX.execSuite.libRegistry;
lR.register('allex_zipimageregistrylib', require('./libindex')(ALLEX, lR.get('allex_imageregistrylib'), lR.get('allex_jobondestroyablelib')));

},{"./libindex":6}],2:[function(require,module,exports){
function createJobs (lib, jobondestroyablelib) {
  'use strict';

  var JobOnDestroyableBase = jobondestroyablelib.JobOnDestroyableBase,
    ZipFetchingJob,
    ZipUnpackingJob;

  function JobOnZipImageRegistry (zir, defer) {
    JobOnDestroyableBase.call(this, zir, defer);
  }
  lib.inherit (JobOnZipImageRegistry, JobOnDestroyableBase);
  JobOnZipImageRegistry.prototype._destroyableOk = function () {
    return this.destroyable && this.destroyable.controller && lib.isFunction(this.destroyable.filename2imageanimationframefunc);
  };

  ZipFetchingJob = require('./zipfetchingjobcreator')(lib, JobOnZipImageRegistry);
  ZipUnpackingJob = require('./zipunpackingjobcreator')(lib, JobOnZipImageRegistry);

  return require('./zipfetchingandunpackingjobcreator')(lib, JobOnZipImageRegistry, ZipFetchingJob, ZipUnpackingJob);
}

module.exports = createJobs;

},{"./zipfetchingandunpackingjobcreator":3,"./zipfetchingjobcreator":4,"./zipunpackingjobcreator":5}],3:[function(require,module,exports){
function createZipFetchingAndUnpackingJob (lib, JobOnZipImageRegistry, ZipFetchingJob, ZipUnpackingJob) {
  'use strict';

  function ZipFetchingAndUnpackingJob (path, zir, defer) {
    JobOnZipImageRegistry.call(this, zir, defer);
    this.path = path;
  }
  lib.inherit(ZipFetchingAndUnpackingJob, JobOnZipImageRegistry);
  ZipFetchingAndUnpackingJob.prototype.destroy = function () {
    this.path = null;
    JobOnZipImageRegistry.prototype.destroy.call(this);
  };
  ZipFetchingAndUnpackingJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    if (!this.path) {
      this.reject(new Error('No path to zip!'));
      return ok.val;
    }
    (new ZipFetchingJob(this.path, this.destroyable)).go().then(
      this.onZipFetched.bind(this),
      this.reject.bind(this),
      this.notify.bind(this)
    );
    return ok.val;
  };
  ZipFetchingAndUnpackingJob.prototype.onZipFetched = function (data) {
    if (!this.okToProceed()){
      return;
    }
    this.notify({
      type : 'zipdownload',
      percent : 100,
      file : this.path
    });
    (new ZipUnpackingJob(data, this.destroyable)).go().then(
      this.resolve.bind(this, this.destroyable),
      this.reject.bind(this),
      this.notify.bind(this)
    );
  };

  return ZipFetchingAndUnpackingJob;
}

module.exports = createZipFetchingAndUnpackingJob;

},{}],4:[function(require,module,exports){
function createZipFetchingJob (lib, JobOnZipImageRegistry) {
  'use strict';

  function ZipFetchingJob (path, zir, defer) {
    JobOnZipImageRegistry.call(this, zir, defer);
    this.path = path;
  }
  lib.inherit(ZipFetchingJob, JobOnZipImageRegistry);
  ZipFetchingJob.prototype.destroy = function () {
    this.path = null;
    JobOnZipImageRegistry.prototype.destroy.call(this);
  };
  ZipFetchingJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    JSZipUtils.getBinaryContent(this.path, this._onZipLoaded.bind(this));
    return ok.val;
  };
  ZipFetchingJob.prototype._onZipLoaded = function (err, data) {
    if (err) {
      this.reject(err);
      return;
    }
    this.resolve(data);
  };

  return ZipFetchingJob;
}

module.exports = createZipFetchingJob;

},{}],5:[function(require,module,exports){
function createZipUnpackingJob (lib, JobOnZipImageRegistry) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  function ZipUnpackingJob (data, zir, defer) {
    JobOnZipImageRegistry.call(this, zir, defer);
    this.data = data;
    this.toload = 0;
    this.loaded = 0;
  }
  lib.inherit(ZipUnpackingJob, JobOnZipImageRegistry);
  ZipUnpackingJob.prototype.destroy = function () {
    this.loaded = null;
    this.toload = null;
    this.data = null;
    JobOnZipImageRegistry.prototype.destroy.call(this);
  };
  ZipUnpackingJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    JSZip.loadAsync(this.data).then(this._onZipData.bind(this));
    return ok.val;
  };
  ZipUnpackingJob.prototype._onZipData = function (zip) {
    var filenames;
    if (!this.okToProceed()) {
      return;
    }
    filenames = [];
    lib.traverseShallow(zip.files, this.prepareLoad.bind(this, filenames));
    this.toload = filenames.length;
    qlib.promise2defer(
      q.all(filenames.reduce(this.loadFile.bind(this, zip), [])),
      this
    );
  };
  ZipUnpackingJob.prototype.prepareLoad = function (filenames, file, filename) {
    var iaf = this.destroyable.filename2imageanimationframefunc(filename);
    if (!(iaf && lib.isVal(iaf.image) && lib.isVal(iaf.animation) && lib.isVal(iaf.frame))) {
      return;
    }
    iaf.filename = filename;
    filenames.push(iaf);
  };
  ZipUnpackingJob.prototype.loadFile = function (zip, promises, iaf) {
    var d = q.defer();
    zip.file(iaf.filename)
      .async('base64')
      .then(this._processBase64.bind(this, iaf, d))
    promises.push(d.promise);
    return promises;
  };

  ZipUnpackingJob.prototype._processBase64 = function (iaf, d, data){
    var img;
    if (!this.okToProceed()) {
      return;
    }
    try {
      img = new Image();
      //img.setAttribute('src', 'data:image/png;base64,'+data);
      img.onload = this._imageLoaded.bind(this, iaf, d);
      img.onerror = d.reject.bind(d, new Error(iaf.filename+' failed to load'));
      img.src = 'data:image/png;base64,'+data;
      this.destroyable.storeImage (iaf.image, iaf.animation, iaf.frame, img);
      return d.promise;
    }catch (e) {
      console.log(e, e.stack);
      defer.reject(e);
    }
  };

  ZipUnpackingJob.prototype._imageLoaded = function (iaf, d) {
    this.loaded++;
    this.notify({
      type: 'zipunpack',
      percent: 100*(this.loaded)/this.toload,
      file: iaf.filename
    });
    d.resolve(true);
    iaf = null;
    d = null;
  };

  return ZipUnpackingJob;
}

module.exports = createZipUnpackingJob;


},{}],6:[function(require,module,exports){
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

},{"./jobs":2}]},{},[1]);
