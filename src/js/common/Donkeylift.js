
var Donkeylift = {

    env: {
      server: 'https://data365.golder.com/api', // overwrite on page load if necessary
      aad: {
        tenant: '46b66e86-3482-4192-842f-3472ff5fe764', //Golder AAD tenant
        client: 'fdbf5216-d507-430d-a333-b49698dc266a' //AAD clientID of Data365 service
      }
    },
  
    ajax: function(url, settings) {
      console.log('Donkeylift.ajax...');
      $('#ajax-progress-spinner').show();
      return new Promise(function(resolve, reject) {
  
        var jqXHR = $.ajax(url, settings);
    
        jqXHR.always(function() {
          $('#ajax-progress-spinner').hide();
        });
  
        jqXHR.done(function(response, textStatus, jqXHR) {
          console.log(response);
          console.log('jqXHR.done ...Donkeylift.ajax');
          resolve({
            response: response,
            jqXHR: jqXHR, 
            textStatus: textStatus
          })
        });
  
        jqXHR.fail(function(jqXHR, textStatus, errorThrown) {
          console.log('jqXHR.fail ...Donkeylift.ajax');
          reject({
            jqXHR: jqXHR, 
            textStatus: textStatus, 
            errorThrown: errorThrown 
          })
        });
      });
    },
  
      util: {
          /*** implementation details at eof ***/
          removeDiacritics: function(str) {
            return str.replace(/[^\u0000-\u007e]/g, function(c) {
              return diacriticsMap[c] || c;
            });
          },
  
      //stackoverflow - https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
      getParameterByName: function(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
      }
    },
    
    login: function(cbAfter) {
  
      var authContext = new AuthenticationContext({
          //instance: 'https://login.microsoftonline.com/',
          tenant: Donkeylift.env.aad.tenant,
          clientId: Donkeylift.env.aad.client
          //popUp: false
      });
  
      // Check For & Handle Redirect From AAD After Login
      authContext.handleWindowCallback();
          
      if ( ! authContext.getCachedUser()) {
          //fyi - this is the actual login redirect
          authContext.config.redirectUri = window.location.href;        
          authContext.login();
          return;
      }
  
      var ajaxFn = Donkeylift.ajax; //hold this for a moment
  
      Donkeylift.ajax = function(url, settings) {
          console.log("Donkeylift.ajax AAD token...");
          return new Promise(function(resolve, reject) {
  
              authContext.acquireToken(authContext.config.clientId, function(error, token) {
                  if (error || !token) {
                      windows.alert("Error acquiring AAD token. Please reload page.");
                      console.log(error);
                      reject(error);
  
                  } else {
                      //add AAD token to ajax request header    
                      settings = settings || {}; settings.headers = settings.headers || {};
                      settings.headers['Authorization'] = 'Bearer ' + token;
  
                      ajaxFn(url, settings).then(function(result) {
                          console.log("ajaxFn.then ...AAD token Donkeylift.ajax");
                          resolve(result);
                      }).catch(function(result) {
                          console.log("ajaxFn.catch ...AAD token Donkeylift.ajax");
                          reject(result);                        
                      });
                  }    
              });
          });    
      }
  
      authContext.acquireToken(authContext.config.clientId, function(error, token) {
          console.log("authContext.acquireToken...");
          if (error || !token) {
              windows.alert("Error acquiring AAD token");
              console.log(error);
              return;
          }
  
          var attrs = jwt_decode(token);
          cbAfter(null, attrs, token);        
      });
    }  
  };
    