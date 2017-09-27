"use strict";
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if(!sender.tab && request.tab) sender.tab = request.tab;

    if(request.action === $Constants.MESSAGES.GET_ORG_ID_BKG){
        
        return chrome.cookies.getAll({
            "name":"sid",
            "url":sender.tab.url},
            function (cookies){

            if(!cookies || !cookies.length || !cookies[0].value) return;

            var oid  = cookies[0].value.split('!')[0];

            $Utils.getAllSessionCookies(function(sessions){
                var message = {
                    action: $Constants.MESSAGES.GET_ORG_ID_CNT, 
                    session: sessions[oid] || {},
                    oid: oid,
                    domain: oid.domain,
                };

                return sendResponse(message);//chrome.tabs.sendMessage(sender.tab.id,message);
            });

        });
        return true;
    }
});
