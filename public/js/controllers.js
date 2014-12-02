'use strict';
var Codeyard = angular.module('Codeyard',['ui.router','btford.socket-io']);

Codeyard.controller('EditorController', ['$scope', 'mySocket',
  function($scope,mySocket) {
    $scope.message = '';
    $scope.file = 'FILENAME';
    $scope.contributors = [];
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

    mySocket.on('connection',function(){
      console('SOcket started');
    });

    mySocket.on('init',function(data){
      $scope.repo = data.repo;
      $scope.userid = data.userid;
      $scope.file = data.file;
      $scope.username = data.username;
    });

    mySocket.on('onlineContributors',function(data){
      $scope.contributors = data.contributors;
      console.log(data);
    })

    mySocket.on('updateChat',function(data){
      console.log(data.from+' says '+data.message);
      angular.element('.chatbox').append("")
    });

    $scope.sendMsg = function(message){
      if($scope.message !== '')
        mySocket.emit('sendMessage',{by:$scope.user,message:message,file:$scope.file},function(){
          $scope.message = '';
        });
    };
}]);