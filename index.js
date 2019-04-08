function createLib (execlib) {
  'use strict';
  return execlib.loadDependencies('client', ['allex:imageregistry:lib', 'allex:jobondestroyable:lib'], require('./libindex').bind(null, execlib));
}

module.exports = createLib;


