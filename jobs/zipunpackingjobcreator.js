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

