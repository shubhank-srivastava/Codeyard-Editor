'use strict';
var Codeyard = angular.module('Codeyard',['ui.router']);

Codeyard.controller('EditorController', ['$scope',
  function($scope) {
    $scope.file = 'FILENAME';
    $scope.init = function() {
      var firepadRef = getExampleRef();
      // Create CodeMirror (with lineWrapping on).
      var codeMirror = CodeMirror(document.getElementById('firepad'), { lineNumbers:true,lineWrapping: true, mode:'javascript'});
      // Create a random ID to use as our user ID (we must give this to firepad and FirepadUserList).
      //var userId = Math.floor(Math.random() * 9999999999).toString();
      // Create Firepad (with rich text features and our desired userId).
      var firepad = Firepad.fromCodeMirror(firepadRef, codeMirror,
          { richTextToolbar: false, richTextShortcuts: false});
      // Create FirepadUserList (with our desired userId).
      //var firepadUserList = FirepadUserList.fromDiv(firepadRef.child('users'),document.getElementById('userlist'), userId);
      // Initialize contents.
      firepad.on('ready', function() {
        if (firepad.isHistoryEmpty()) {
            firepad.setText('Check out the user list to the left!');
        }
      });
    }

    function getExampleRef() {
      var ref = new Firebase('https://codeyard.firebaseIO.com');
      var hash = window.location.hash.replace(/#!\/edit/g, '');
      if (hash) {
        ref = ref.child(hash);
      } else {
        ref = ref.push(); // generate unique location.
        window.location = window.location + '#' + ref.key(); // add it as a hash to the URL.
      }
      if (typeof console !== 'undefined')
        console.log('Firebase data: ', ref.toString());
      return ref;
    }

}]);