var lR = ALLEX.execSuite.libRegistry;
lR.register('allex_zipimageregistrylib', require('./libindex')(ALLEX, lR.get('allex_imageregistrylib'), lR.get('allex_jobondestroyablelib')));
