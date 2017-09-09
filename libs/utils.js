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


        //Lightning Experience enabled
        isLEX: function(url){
            url = url || window.location.href;
            return url.indexOf('/one/one.app') > 0;
        },

        getAllSessionCookies: function (callback){
            //In LEX mode we can find 2 different sids:
            //- one with domain *.lightning.force.com >> unable to access APIs
            //- one with domain *.salesforce.com >> able to access APIs
            //
            //get all sid cookies and take only the ones with the corresponding domains
            chrome.cookies.getAll({"name":"sid"},function (sidCookies){
                var cookiesList = [];
                var domains = [];
                for(var j=0;j<sidCookies.length;j++){

                    if(sidCookies[j].domain.indexOf('.') === 0){
                        sidCookies[j].domain = sidCookies[j].domain.substring(1,sidCookies[j].domain.length);
                    }
                    var cookieDomain = sidCookies[j].domain;

                    //master session comes from salesforce.com
                    var _isMaster = (cookieDomain.indexOf("salesforce.com")>=0) 
                        || (cookieDomain.indexOf("lightning.force.com")>=0);

                    domains.push('https://'+sidCookies[j].domain+'/*');

                    cookiesList.push({
                        sid: sidCookies[j].value, 
                        domain: cookieDomain,
                        isMaster: _isMaster,
                        oid: sidCookies[j].value.split('!')[0],
                        //isLex: false,
                    });
                }

                //checks which cookie has an open tab
                chrome.tabs.query({url: domains}, function(tabs){

                    var tmpCookiesMap = {};

                    if(tabs && tabs.length){
                        for(var i = 0; i < tabs.length; i++){
                            var tab = tabs[i];
                            
                            for(var j=0;j<cookiesList.length;j++){
                                var cookie = cookiesList[j];
                                if(tab.url && tab.url.indexOf(cookie.domain) >= 0){
                                    cookie.isActive = true;
                                    cookie.isLex = $Utils.isLEX(tab.url);
                                    cookie.server = cookie.domain.split('.')[0],
                                    cookie.domainAPI = cookie.domain;
                                    //"lightning.force.com" is master only if coupled with LEX
                                    if(!cookie.isLex 
                                        && cookie.domain.indexOf("lightning.force.com") >=0){
                                        cookie.isMaster = false;
                                    } 
                                }
                            }

                            //creates a map of active sessions
                            for(var j=0;j<cookiesList.length;j++){
                                var cookie = cookiesList[j];
                                var tmpCookie = {
                                    domain: cookie.domain,
                                    server: cookie.domain.split('.')[0],
                                    domainAPI: cookie.domain,
                                    isLex: cookie.isLex,
                                    oid: cookie.oid,
                                    sid: cookie.sid,
                                    isActive: !!cookie.isActive,
                                    isMaster: !!cookie.isMaster,
                                };

                                if(!tmpCookiesMap[tmpCookie.oid] 
                                    || (tmpCookie.isActive
                                        && tmpCookie.isMaster)
                                    || (!$Utils.isLEX(tmpCookie.domain)
                                        && tmpCookie.isMaster
                                        && !tmpCookiesMap[tmpCookie.oid].isActive)
                                    ){
                                    tmpCookiesMap[tmpCookie.oid] = tmpCookie;
                                    console.log(tmpCookie);
                                }
                            }

                            //in case of LEX mode, the serverAPI endpoint is the *.salesforce.com
                            //and its "sid"
                            for(var key in tmpCookiesMap){
                                if(!tmpCookiesMap[key].isLex 
                                    && !$Utils.isLEX(tmpCookiesMap[key].domain)) continue;

                                for(var j = 0; j < cookiesList.length; j++){
                                    if(cookiesList[j].oid !== key) continue;
                                    if(cookiesList[j].isLex
                                        || $Utils.isLEX(cookiesList[j].domain)) continue;
                                    if(!cookiesList[j].isMaster) continue;
                                    tmpCookiesMap[key].domainAPI = cookiesList[j].domain;
                                    tmpCookiesMap[key].sid = cookiesList[j].sid;
                                    break;
                                }
                            }
                            
                            for(var key in tmpCookiesMap){
                                if(!tmpCookiesMap[key].domainAPI) tmpCookiesMap[key].domainAPI = tmpCookiesMap[key].domain;
                            } 
                        }
                    }

                    return callback(tmpCookiesMap);
     
                });
            });

        },

        getSFIdFromUrl: function(url, isLex){
            url = url || '';
            if(!url){
                throw new Error('Invalid Sobject URL (1)');
            }

            if(!isLex){
                var splitUrl = url.split('/');
                var id = splitUrl[splitUrl.length-1];
                id = id.split('?')[0];
                return id.split('#')[0];
            }else{
                //format: http://...#/sObject/ID/....
                var splitUrl = url.split('#');
                if(splitUrl.length < 2) return false;
                var id = splitUrl[1].split('#')[0];
                id = id.replace('/sObject/','');
                return id.split('/')[0];
            }
        },

        checkIfSobjectPage : function(isLex){
            var url = window.location.href;
            if(!url){
                return false;
            }

            if(!isLex){
                var splitUrl = url.split('/');
                var id = splitUrl[splitUrl.length-1];
                id = id.split('?')[0];
                id = id.split('#')[0];
                return $Utils.isSalesforceId(id);
            }else{
                //format: http://...#/sObject/ID/....
                var splitUrl = url.split('#');
                if(splitUrl.length < 2) return false;
                var id = splitUrl[1].split('#')[0];
                id = id.replace('/sObject/','');
                id = id.split('/')[0];
                return $Utils.isSalesforceId(id)
            }
        },

        isSalesforceId : function (id){
            return /^([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$/.test(id||'');
        },
    };
})();