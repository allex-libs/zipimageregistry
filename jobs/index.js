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
