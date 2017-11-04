/**
 * @author Enrico Murru (@enreeco)
 * @link https://blog.enree.co
 * @description Plugin's background listener
 */
"use strict";
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if(!sender.tab && request.tab) sender.tab = request.tab;

    if(request.action === $Constants.MESSAGES.GET_ORG_ID_BKG){
        //gets caller page's "sid" cookie (to get organization ID)
        chrome.cookies.getAll({
            "name":"sid",
            "url":sender.tab.url},
            function (cookies){

            if(!cookies || !cookies.length || !cookies[0].value) return;

            var oid  = cookies[0].value.split('!')[0];

            //gets all available session cookies and returns the
            //one associated with the current org id
            $Utils.getAllSessionCookies(function(sessions){
                var message = {
                    session: sessions[oid] || {},
                    oid: oid,
                    domain: oid.domain,
                };
                return sendResponse(message);
            });

        });
        //this tells Chrome that the background message is 
        //about to respond asynchronously
        return true;
    }
});
