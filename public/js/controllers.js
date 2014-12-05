'use strict';
var Codeyard = angular.module('Codeyard',['ui.router','btford.socket-io']);

Codeyard.controller('EditorController', ['$scope', 'mySocket','Editor',
  function($scope, mySocket, Editor) {
    var str = window.location.pathname;
    $scope.userid = str.substring(str.lastIndexOf("r")+2,str.lastIndexOf("/"));
    $scope.fileid = str.substring(str.lastIndexOf("/")+1);  
    $scope.message = '';
    $scope.contributors = [];
    var FIREPAD;
    function initEditor(contents) {
      var firepadRef = getExampleRef();
      var codeMirror = CodeMirror(document.getElementById('firepad'), {
        lineNumbers: true,
        mode: 'javascript'
      });
      var firepad = Firepad.fromCodeMirror(firepadRef, codeMirror, {
        defaultText: contents
      });
      firepad.setUserId($scope.userid);
      FIREPAD = firepad;
    }

    function getExampleRef() {
      var ref = new Firebase('https://codeyard.firebaseIO.com');
      var hash = $scope.file._id;
      if (hash) {
        ref = ref.child(hash);
      } else {
        alert('You are not authorized');
        window.location.assign('http://localhost:8080/NoAccess.html');
      }
      if (typeof console !== 'undefined')
        console.log('Firebase data: ', ref.toString());
      return ref;
    }

    mySocket.on('connect',function(){
      mySocket.emit('init',{userid:$scope.userid,fileid:$scope.fileid});
    });

    mySocket.on('init',function(data){
      $scope.repo = data.repo;
      for (var i = 0; i < $scope.repo.contributors.length; i++) {
        if($scope.repo.contributors[i]._id == $scope.userid)
          $scope.username=$scope.repo.contributors[i].username;
        if($scope.repo.contributors[i]._id == $scope.repo.owner)
          $scope.ownername=$scope.repo.contributors[i].username;
      };
      for(var i=0;i<data.repo.files.length;i++){
        if(data.repo.files[i]._id===$scope.fileid)
          $scope.file = data.repo.files[i];
      }   
      initEditor(data.fileContents);
    });

    mySocket.on('imonline',function(data){
      for (var i = 0; i < $scope.repo.contributors.length; i++) {
        if($scope.repo.contributors[i]._id == data.userid)
          $scope.repo.contributors[i].isonline=1;
      };
    });

    mySocket.on('updateChat',function(data){
      var username;
      for (var i = 0; i < $scope.repo.contributors.length; i++) {
        if($scope.repo.contributors[i]._id==data.from)
          username = $scope.repo.contributors[i].username;
      };
      angular.element('.chatbox').append("<br><b>"+username+"</b> : "+data.message);
    });

    mySocket.on('commit_done',function(data){

    });

    $scope.sendMsg = function(message){
      if($scope.message !== '')
        mySocket.emit('sendMessage',{by:$scope.userid,message:message,file:$scope.fileid});
        $scope.message = '';
    };

    $scope.sendCommit = function(desc){
      var content = FIREPAD.getText();
      Editor.sendCommit(
          { 
            desc: desc,
            content: content,
            reposlug: $scope.repo.slug,
            repoid: $scope.repo._id,
            userid: $scope.repo.owner,
            username: $scope.ownername,
            file: $scope.file
          }
      ).success(function(data){
        $scope.desc = '';
        $scope.commit_done = "";
        $scope.viewCommit = true;
      }).error(function(err){
        console.log(err);
      });
    };


}]);