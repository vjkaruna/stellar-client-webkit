// bruteRequest() wrap $.ajax to automatically retry when express-brute rate limits a request.
var bruteRequest = angular.module('bruteRequest', []);


bruteRequest.factory('bruteRequest', function($timeout){
    var bruteRequest = function(options){
      this.options = options;
      this.pendingRequest = null;
    };

    bruteRequest.prototype.send = function(data, success, fail){
      var options = this.options;

      success = success || function () {};
      fail = fail || function () {};

      if (this.pendingRequest) this.pendingRequest.abort();

      pendingRequest = $.ajax({url: options.url, success: success, data: data, dataType: options.dataType, type: options.type})
        .done(function (response) {
          this.pendingRequest = null;
        })
        .fail(function (response, error, message) {
          console.log("fail");
          if (message === 'Too Many Requests') {
            var suggestedRetryTime = new Date(response.responseJSON.error.nextValidRequestDate).getTime();
            var waitTime = suggestedRetryTime - Date.now();

            // Resend the request at the suggested time.
            console.log("Waiting " + waitTime + "ms");
            $timeout(function(){
              this.send(data, success, fail);
            }.bind(this), waitTime);
          } else {
            fail(response, error, message);
          }
        }.bind(this));
    };

    return bruteRequest;
  })
;


bruteRequest.config(function($httpProvider) {
  $httpProvider.interceptors.push(function($q, $timeout, $injector) {
    var interceptor = {};

    interceptor.responseError = function(rejection) {
      console.log(rejection);
      // if we're getting the brute rejection resposne
      if (rejection.status == 429) {
        var $http              = $injector.get('$http');
        var body               = rejection.data;
        var suggestedRetryTime = new Date(body.error.nextValidRequestDate).getTime();
        var waitTime           = suggestedRetryTime - Date.now();
        console.log("waiting for " + waitTime);
        var nextAttempt        = $timeout(function(){
                                   console.log("next attempt")
                                   return $http(rejection.config);
                                 }, waitTime);


        return nextAttempt;
      } else {
        return $q.reject(rejection);
      }
    };

    return interceptor;
  });
});