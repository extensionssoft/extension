// Detect if we're dealing with Firefox or Chrome
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

// contains already called method names
var _called = {};

//old before MV3
//var background_debug_msg = (!isFirefox && window.chrome && chrome.runtime && !('update_url' in chrome.runtime.getManifest()))? 55 : false;
var background_debug_msg = (!isFirefox && chrome && chrome.runtime && !('update_url' in chrome.runtime.getManifest()))? 55 : false;

var mpDebug = {
    css: function( backgroundColor ) {
        return 'background-color: #' + backgroundColor + '; padding: 3px 10px;';
    }
};

if (background_debug_msg) {
    mpDebug.log = function( message ) {
        this.log( message );
    }
//old before MV3	
//    mpDebug.log = console.log.bind(window.console);
//    mpDebug.warn = console.warn.bind(window.console);
//    mpDebug.trace = console.trace.bind(window.console);
//    mpDebug.error = console.error.bind(window.console);
	
    mpDebug.log = console.log.bind(console);
    mpDebug.warn = console.warn.bind(console);
    mpDebug.trace = console.trace.bind(console);
    mpDebug.error = console.error.bind(console);	
} else {
    mpDebug.log = function() {}
    mpDebug.log = function() {}
    mpDebug.warn = function() {}
    mpDebug.trace = function() {}
    mpDebug.error = function() {}
}

/* Initialize mooltipass lib */
if (typeof mooltipass == 'undefined') {
    mooltipass = {};
}
mooltipass.backend = mooltipass.backend || {};


/**
 * Stored blacklisted websites
 * Information are saved in the local storage of this extension in Chrome
 */
//old before MV3 
//mooltipass.backend._blacklist = typeof(localStorage.mpBlacklist)=='undefined' ? {} : JSON.parse(localStorage.mpBlacklist);

ReadBlacklist();

/**
 * Boolean to only display once the notification about missing app
 */
mooltipass.backend.noAppNotifShown = false;

/** 
 * Last icon name set 
 */
mooltipass.backend.lastIconSetName = "";


async function ReadBlacklist(){
    try {			
	    let storeItems = await chrome.storage.local.get(["mpBlacklist"]);
				
        if (storeItems.mpBlacklist){
            mooltipass.backend._blacklist = JSON.parse(storeItems.mpBlacklist)
        } else {
			mooltipass.backend._blacklist = {};
		}			
	
    } catch (e) {
        console.log('Error reading Blacklist');
    }
}

async function SaveBlacklist(sBlacklist){
    try {			
        await chrome.storage.local.set({mpBlacklist : sBlacklist});	
    } catch (e) {
        console.log('Error save Blacklist');
    }	
}


mooltipass.backend.setStatusIcon = function(icon_name) {
    if ( isFirefox ) {
        //var theFunction = browser.browserAction.setIcon;
		var theFunction = browser.action.setIcon;
    } else {
        var theFunction = chrome.action.setIcon;
    }

    if (mooltipass.backend.lastIconSetName != icon_name)
    {
        mooltipass.backend.lastIconSetName = icon_name;
        theFunction({
            //tabId: page.currentTabId,
            path: "/images/icon_" + icon_name + "_19.png"
        });
    }
}

mooltipass.backend.updateStatusIcon = function() {
    var status = mooltipass.device.getStatus();
    if (status['deviceUnlocked']) {
        iconName = "normal";
    } else {
        iconName = "cross";
    }

    if ( !isSafari ) {
        if ( typeof chrome.notifications.getPermissionLevel == 'function') {
            chrome.notifications.getPermissionLevel(function(response) {
                if (response == 'denied') {
                    iconName += "_warning";
                }
            });  
        }
    }

    mooltipass.backend.setStatusIcon(iconName);
}
mooltipass.backend._updateStatusIcon = function() {
    mooltipass.backend.updateStatusIcon();
    setTimeout(mooltipass.backend._updateStatusIcon, 500);
}

/**
 * Load the backend settings of this extension
 * @access: backend
 */
mooltipass.backend.loadSettings = function() {
    //old before MV3	
    //mooltipass.backend._blacklist = typeof(localStorage.mpBlacklist)=='undefined' ? {} : JSON.parse(localStorage.mpBlacklist);
	ReadBlacklist();
}

/**
 * Checks whether a given URL is blacklisted
 * @access backend
 * @param url
 * @returns {boolean}
 */
mooltipass.backend.isBlacklisted = function(url) {
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c isBlacklisted ','background-color: #ffc107','color: #000', url, url in mooltipass.backend._blacklist);
    return url in mooltipass.backend._blacklist;
}

/**
 * Adds an URL to the blacklist
 * @access backend
 * @param url
 */
mooltipass.backend.blacklistUrl = function(url) {
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c got blacklist req. for ','background-color: #ffc107','color: #000', url);

    if(url.indexOf('://') > -1) {
        var parsed_url = mooltipass.backend.extractDomainAndSubdomain(url);
        var subdomain;
        var domain;

        // See if our script detected a valid domain & subdomain
        if(!parsed_url.valid)
        {
            if (background_debug_msg > 4) mpDebug.log('%c backend: %c Invalid URL for blacklisting given','background-color: #ffc107','color: #000', url);
            return;
        }

        domain = parsed_url.domain;
        subdomain = parsed_url.subdomain;

        url = subdomain ? subdomain + '.' + domain : domain;
    }

    //console.log( mooltipass.backend._blacklist );

    mooltipass.backend._blacklist[url] = true;
    //old before MV3
    //localStorage.mpBlacklist = JSON.stringify(mooltipass.backend._blacklist);
	SaveBlacklist(JSON.stringify(mooltipass.backend._blacklist));
};

mooltipass.backend.handlerBlacklistUrl = function(callback, tab, url) {
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c handlerBlacklistUrl','background-color: #ffc107','color: #000', url);
    mooltipass.backend.blacklistUrl(url);
    callback(true);
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c updated blacklist store ','background-color: #ffc107','color: #000', url);
}

/**
 * Removes an URL from the blacklist
 * @access backend
 * @param url
 */
mooltipass.backend.unblacklistUrl = function(url) {
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c got blacklist removal req. for','background-color: #ffc107','color: #000', url);

    if(url.indexOf('://') > -1) {
        var parsed_url = mooltipass.backend.extractDomainAndSubdomain(url);
        var subdomain;
        var domain;

        // See if our script detected a valid domain & subdomain
        if(!parsed_url.valid)
        {
            if (background_debug_msg > 4) mpDebug.log('%c backend: %c Invalid URL for blacklisting given:','background-color: #ffc107','color: #000', url);
            return;
        }

        domain = parsed_url.domain;
        subdomain = parsed_url.subdomain;

        url = subdomain ? subdomain + '.' + domain : domain;
    }

    delete mooltipass.backend._blacklist[url];
    //old before MV3	
    //localStorage.mpBlacklist = JSON.stringify(mooltipass.backend._blacklist);
    SaveBlacklist(JSON.stringify(mooltipass.backend._blacklist));	
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c updated blacklist store ','background-color: #ffc107','color: #000', url);
};

mooltipass.backend.handlerUnBlacklistUrl = function(callback, tab, url) {
    mooltipass.backend.unblacklistUrl(url);
    callback(true);
}

/**
 * Extract domain and subdomain from a given URL and checks whether the URL is valid at all
 * @access backend
 * @param url
 * @returns {{valid: {boolean}, domain: {string|null}, subdomain: {string|null}}}
 */
mooltipass.backend.extractDomainAndSubdomain = function ( url ) {
    if (background_debug_msg > 4) mpDebug.log('%c backend: %c extractDomainAndSubdomain ','background-color: #ffc107','color: #000', url);

    var toReturn = { url: url, valid: false, domain: null, subdomain: null, blacklisted: false, port: null };
    
    // Don't know why this is here, leaving it just in case
    toReturn.url = toReturn.url.replace('www.', 'wWw.');

    // URL trimming
    // Remove possible www.
    toReturn.url = toReturn.url.replace(/:\/\/www./ig, '://');
    toReturn.url = toReturn.url.replace(/^www\./ig, '');
    // Remove everything before ://
    //    also ensure that only the first :// is used
    //    (negative example: https://id.atlassian.com/login?continue=https://my.atlassian.com&application=mac)
    toReturn.url = toReturn.url.replace(/^[^:]+:\/\//ig, "");
    // Remove everything after first /
    var n = toReturn.url.indexOf('/');
    toReturn.url = toReturn.url.substring(0, n != -1 ? n : url.length);
    // Remove everything after first : and save as port.
    var n = toReturn.url.indexOf(':');
    toReturn.port = toReturn.url.substring(n != -1 ? n + 1 : toReturn.url.length);
    toReturn.url = toReturn.url.substring(0, n != -1 ? n : toReturn.url.length);
    // Remove possible starting '.', (residual from www[number] urls)
    if((toReturn.url.length > 0) && (toReturn.url.charAt(0) == '.')) {
        toReturn.url = toReturn.url.substring(1);
    }

    if(psl.isValid(toReturn.url)) {
        // Managed to extract a domain using the public suffix list
        toReturn.valid = true;
        var parsed = psl.parse( String(toReturn.url) );
        toReturn.domain = parsed.domain + (toReturn.port ? ':' + toReturn.port : '');
        toReturn.subdomain = parsed.subdomain;
    } else {
        // In other case use url as a domain.
        toReturn.valid = true;
        toReturn.domain = toReturn.url + (toReturn.port ? ':' + toReturn.port : '');
        toReturn.subdomain = null;
    }

    var toBeProcessedUrl = toReturn.subdomain ? toReturn.subdomain + '.' + toReturn.domain : toReturn.domain;
    if (mooltipass.backend.isBlacklisted(toReturn.domain) || mooltipass.backend.isBlacklisted(toBeProcessedUrl ) ) {
        toReturn.blacklisted = true;
    }

    if (background_debug_msg > 3) mpDebug.log('%c backend: %c extractDomainAndSubdomain results for: ' + url ,'background-color: #ffc107','color: #000', toReturn);
    return toReturn;
}

setTimeout( function() {
    mooltipass.backend._updateStatusIcon();
},500);
