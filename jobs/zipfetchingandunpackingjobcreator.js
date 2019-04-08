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
