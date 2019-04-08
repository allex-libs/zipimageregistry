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
