window.$Utils = window.$Utils || (function(){
    "use strict";
    return {

        //Get a param value from the tab's URL
        getURLParameter: function(name) {
            return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
        },

        
        /*
         * Parse current page URL to check if the page is a OAuth result page
         * and if so, return an object containing all OAuth token info
         * Web Server Flow: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_understanding_web_server_oauth_flow.htm
         * Connected app is configured not to use the "CLIENT_SECRET" (see "Require Secret for Web Server Flow" option)
         * @callback: function(@Boolean(isOauth), @Object(OauthData))
         *            @isOauth: TRUE if the url contains OAuth data
         *            @OauthData: object containing OAuth info (success) or OAuth error details
         */
        parseOAuthPageUrlWebServerFlow: function(callback){
            var pageUrl = window.location.href;

            var code = $Utils.getURLParameter('code');
            var state = $Utils.getURLParameter('state');    //contains the original login url
            if(code){
                //web server flow
                var url = state+'/services/oauth2/token';
                var body = ('grant_type=authorization_code&client_id='+encodeURIComponent($Constants.CLIENT_ID)
                        +'&redirect_uri='+encodeURIComponent('chrome-extension://'+chrome.runtime.id+'/options.html')
                        +'&code='+encodeURIComponent(code));
                console.log(url, body);
                return $.ajax({
                    url: url,
                    method: 'POST',
                    data: body,
                    headers:{
                        'Accept': 'application/json',
                    },
                    success: function(result,status,xhr){
                        console.log(result);
                        //result.refresh_token = refToken;
                        result.userId = result.id.split('/')[5];
                        result.orgId = result.id.split('/')[4];

                        return $Utils.getUserInfo(result.id, result.access_token, function(err, usrRslt){
                            if(err){
                                //no user info retrieved: it is not used
                                usrRslt = {};
                            }

                            result.username = usrRslt.username;
                            result.first_name = usrRslt.first_name;
                            result.last_name = usrRslt.last_name;

                            return chrome.storage.local.get(['refresh_tokens'], function(params){
                                //add currently got token
                                params = params || {};
                                params.refresh_tokens = params.refresh_tokens || {};
                                params.refresh_tokens[result.userId+'_'+result.orgId] = result;

                                return chrome.storage.local.set(params, function(){
                                    return callback && callback(true, null);
                                });
                            });
                        });

                        
                        
                    },
                    error: function(data){
                        return callback && callback(true, data);
                    }
                });
            }
            return callback && callback(false);
            
        },

        /*
         * Do a Refresh Token request
         * @serverUrl: server main URL
         * @refToken: original refresh token
         * @callback: function(@Object(error), @Object(OAuthData))
         */
        doRefreshToken: function(serverUrl, refToken, callback){
            var url = serverUrl+'/services/oauth2/token';
            var body = ('grant_type=refresh_token&client_id='+encodeURIComponent($Constants.CLIENT_ID)
                    +'&refresh_token='+encodeURIComponent(refToken));
            
            $.ajax({
                url: url,
                method: 'POST',
                data: body,
                headers:{
                    'Accept': 'application/json',
                },
                success: function(result,status,xhr){
                    
                    result.refresh_token = refToken;
                    result.userId = result.id.split('/')[5];
                    result.orgId = result.id.split('/')[4];

                    return $Utils.getUserInfo(result.id, result.access_token, function(err, usrRslt){
                        if(err){
                            //no user info retrieved: it is not used
                            usrRslt = {};
                        }

                        result.username = usrRslt.username;
                        result.first_name = usrRslt.first_name;
                        result.last_name = usrRslt.last_name;

                        return chrome.storage.local.get(['refresh_tokens'], function(params){
                            //add currently got token
                            params = params || {};
                            params.refresh_tokens = params.refresh_tokens || {};
                            params.refresh_tokens[result.userId+'_'+result.orgId] = result;

                            return chrome.storage.local.set(params, function(){
                                return callback && callback(null, result);
                            });
                        });
                    });
                    
                },
                error: function(data){
                    return callback && callback(data);
                }
            });
        },

        /*
         * Get current user info
         * @userUrl: userinfo url (from oauth_object.id)
         * @accessToken: authentication
         * @callback: function(@Object(error), @Object(userInfo))
         */
        getUserInfo: function(userUrl, accessToken, callback){
            $.ajax({
                url: userUrl,
                method: 'GET',
                headers:{
                    'Authorization' : 'Bearer '+accessToken,
                },
                success: function(result,status,xhr){
                    return callback && callback(null, result);
                },
                error: function(data){
                    return callback && callback(data);
                }
            });
        },

        /*
         * Starts OAuth flow to acquire a new refresh token
         * @server: server url (production, test, ...)
         */
        startOAuthFlow: function(server){
            var scopes = ['web','api','refresh_token'];
            //User Agent Flow
            var url = server+'/services/oauth2/authorize?response_type=code'
                    +'&client_id='+$Constants.CLIENT_ID
                    +'&state='+encodeURIComponent(server)
                    //only for web server
                    +'&immediate=false'
                    +'&prompt=login'
                    +'&redirect_uri='+encodeURIComponent('chrome-extension://'+chrome.runtime.id+'/options.html')
                    +'&scope='+scopes.join('%20')+'&display=popup';
            window.location.href = url;
        },

        getTabSessionId: function(){
            
        }
    };
})();