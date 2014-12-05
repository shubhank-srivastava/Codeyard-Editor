'use strict';

Codeyard.factory('Editor', ['$http',
  function($http) {
    factory = {};
    factory.sendCommit = function(payload){
        return $http.post('/commit',payload);
    }
    return factory;
  }
]).
factory('mySocket', function (socketFactory) {
    return socketFactory();
});