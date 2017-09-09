"use strict";

(function(){

    chrome.runtime.sendMessage({action: "BKG-GET-ORG-SID"});
    
    
    setInterval(function(){
        chrome.runtime.sendMessage({action: "BKG-GET-ORG-SID"});
    }, 5000);
     
}());


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "CNT-SET-ORG-SID"){
            

            var getSFIdFromURL = function(isLEX){
                if($Utils.checkIfSobjectPage(isLEX)){
                    return $Utils.getSFIdFromUrl(window.location.href, isLEX)
                }else{
                    var pid = $Utils.getURLParameter('id');
                    if($Utils.isSalesforceId(pid)){
                        return pid;
                    }
                }
                return null;
            };

            var objectId = getSFIdFromURL(request.session.isLex);

            console.log(request);
            console.log('objectId ?' + objectId);
        }
});