var browserAction = {};

browserAction.show = function(callback, tab) {
	if (background_debug_msg > 4) mpDebug.log('%c browserAction: show ', mpDebug.css('FFD389') , tab );
	
	var data = {};
	if(!page.tabs[tab.id] || page.tabs[tab.id].stack.length == 0) {
		browserAction.showDefault(callback, tab);
		return;
	}
	else {
		data = page.tabs[tab.id].stack[page.tabs[tab.id].stack.length - 1];
	}

	if(data.popup) {
		chrome.tabs.get(tab.id, function() {
			if (!chrome.runtime.lastError) {
				chrome.action.setPopup({
					tabId: tab.id,
					popup: "popups/" + data.popup
				});
    		} else {
    			if (background_debug_msg > 1) mpDebug.log('%c Chrome runtime error ', mpDebug.css('FFD389') , chrome.runtime.lastError );
    		}
		});
	}
}

browserAction.update = function(interval) {
	if(!page.tabs[page.currentTabId] || page.tabs[page.currentTabId].stack.length == 0) {
		return;
	}

	var data = page.tabs[page.currentTabId].stack[page.tabs[page.currentTabId].stack.length - 1];

    if(typeof data.visibleForMilliSeconds != "undefined") {
		if(data.visibleForMilliSeconds <= 0) {
			browserAction.stackPop(page.currentTabId);
			browserAction.show(null, {"id": page.currentTabId});
			page.clearCredentials(page.currentTabId);
            return;
		}
		data.visibleForMilliSeconds -= interval;
	}

	if(data.intervalIcon) {
		data.intervalIcon.counter += 1;
		if(data.intervalIcon.counter < data.intervalIcon.max) {
			return;
		}

		data.intervalIcon.counter = 0;
		data.intervalIcon.index += 1;

		if(data.intervalIcon.index > data.intervalIcon.icons.length - 1) {
			data.intervalIcon.index = 0;
		}
	}
}

browserAction.showDefault = function(callback, tab) {
	if (background_debug_msg > 4) mpDebug.log('%c browserAction: showDefault ', mpDebug.css('FFD389') , tab );
	var stackData = {
		level: 1,
		iconType: "normal",
		popup: "popup_status.html"
	}
	
	if(!mooltipass.device.isUnlocked() || page.tabs[tab.id].errorMessage) {
		stackData.iconType = "cross";
	}

    if( typeof( page.tabs[tab.id] ) != 'undefined' && page.tabs[tab.id].loginList.length > 0) {
        stackData.iconType = "questionmark";
        stackData.popup = "popup_login.html";
    }

    browserAction.stackUnshift(stackData, tab.id); 
    browserAction.show(null, tab);
}

browserAction.stackAdd = function(callback, tab, icon, popup, level, push, visibleForMilliSeconds, dontShow) {
	var id = tab.id || page.currentTabId;

	if(!level) {
		level = 1;
	}

	var stackData = {
		"level": level,
		"icon": icon
	}

	if(popup) {
		stackData.popup = popup;
	}

	if(visibleForMilliSeconds) {
		stackData.visibleForMilliSeconds = visibleForMilliSeconds;
	}

	if(push) {
		browserAction.stackPush(stackData, id);
	}
	else {
		browserAction.stackUnshift(stackData, id);
	}

	if(!dontShow) {
		browserAction.show(null, {"id": id});
	}
}


browserAction.removeLevelFromStack = function(callback, tab, level, type, dontShow) {
	if(!page.tabs[tab.id]) {
		if (background_debug_msg > 4) mpDebug.log('%c browserAction.removeLevelFromStack() no tab.id ', mpDebug.css('FFD389') , tab );
		return;
	}

	if(!type) {
		type = "<=";
	}

	var newStack = [];
	for(var i = 0; i < page.tabs[tab.id].stack.length; i++) {
		if(
			(type == "<" && page.tabs[tab.id].stack[i].level >= level) ||
			(type == "<=" && page.tabs[tab.id].stack[i].level > level) ||
			(type == "=" && page.tabs[tab.id].stack[i].level != level) ||
			(type == "==" && page.tabs[tab.id].stack[i].level != level) ||
			(type == "!=" && page.tabs[tab.id].stack[i].level == level) ||
			(type == ">" && page.tabs[tab.id].stack[i].level <= level) ||
			(type == ">=" && page.tabs[tab.id].stack[i].level < level)
		) {
			newStack.push(page.tabs[tab.id].stack[i]);
		}
	}

	page.tabs[tab.id].stack = newStack;

	if(!dontShow) {
		if (background_debug_msg > 4) mpDebug.log('%c browserAction.removeLevelFromStack() showing tab ', mpDebug.css('FFD389') );
		browserAction.show(callback, tab);
	}
}

browserAction.stackPop = function(tabId) {
	var id = tabId || page.currentTabId;

	page.tabs[id].stack.pop();
};

browserAction.stackPush = function(data, tabId) {
	var id = tabId || page.currentTabId;

	if (background_debug_msg > 4) mpDebug.log('%c browserAction: stackPush', mpDebug.css('FFD389') );
	browserAction.removeLevelFromStack(null, {"id": id}, data.level, "<=", true);
	page.tabs[id].stack.push(data);
};

browserAction.stackUnshift = function(data, tabId) {
	var id = tabId || page.currentTabId;

	browserAction.removeLevelFromStack(null, {"id": id}, data.level, "<=", true);
	page.tabs[id].stack.unshift(data);
};


browserAction.removeRememberPopup = function(callback, tab, removeImmediately) {
	if(!page.tabs[tab.id]) {
		return;
	}

	if(page.tabs[tab.id].stack.length == 0) {
        page.clearCredentials(tab.id);
		return;
	}

    if(removeImmediately) {
        browserAction.stackPop(tab.id);
        browserAction.show(null, {"id": tab.id});
        page.clearCredentials(tab.id);
        return;
    }
};

browserAction.setRememberPopup = function(tabId, username, password, url, usernameExists, credentialsList) {
	var id = tabId || page.currentTabId;

	if (background_debug_msg > 4) mpDebug.log('%c browserAction: setRememberPopup ', mpDebug.css('FFD389') );
	var stackData = {
        visibleForMilliSeconds: 7500,
		level: 10,
		intervalIcon: {
			index: 0,
			counter: 0,
			max: 2,
			icons: ["icon_remember_red_background_19x19.png", "icon_remember_red_lock_19x19.png"]
		},
		popup: "popup_remember.html"
	}

	browserAction.stackPush(stackData, id);

	page.tabs[id].credentials = {
		"username": username,
		"password": password,
		"url": url,
		"usernameExists": usernameExists,
		"list": credentialsList
	};

	browserAction.show(null, {"id": id});
}
