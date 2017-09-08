"use strict";

(function(){

    chrome.runtime.sendMessage({action: "BKG-GET-ORG-SID"});
    
}());

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "CNT-SET-ORG-SID"){
            console.log(request);
        }
});