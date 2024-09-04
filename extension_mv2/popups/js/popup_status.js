
// Detect if we're dealing with Firefox, Safari, or Chrome
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

var _settings = typeof (localStorage.settings) == 'undefined' ? {} : JSON.parse(localStorage.settings);

    // Unify messaging method - And eliminate callbacks (a message is replied with another message instead)
    function messaging(message, callback) {
        chrome.runtime.sendMessage(message, callback);
    };

function initSettings() {

    // Display strings in proper locale
    initLocale();

    mpJQ(".pure-menu-list .pure-menu-item").click(function () {

    });

    mpJQ("#btn-settings").click(function (e) {
            chrome.tabs.create({
                url: "/options/options.html"
            });
    });



    mpJQ("#btn-report-error").click(function (e) {
            mooltipass.website.reportError(function (target_url) {
                chrome.tabs.create({
                    url: target_url
                })
            });
    });

    mpJQ("#btn-select-credential-fields").click(function (e) {
        e.preventDefault()
        if ($(this).hasClass('disabled')) return

            var global = chrome.extension.getBackgroundPage();
            mooltipass.website.chooseCredentialFields();
            close();
    });

    mpJQ("#btn-add-site-to-blacklist").click(function (e) {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                chrome.runtime.sendMessage({
                    action: 'blacklist_url',
                    args: [tabs[0].url]
                }, function () { });
                close();
            });
    });

    mpJQ("#btn-remove-site-from-blacklist").click(function (e) {
            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                chrome.runtime.sendMessage({
                    action: 'unblacklist_url',
                    args: [tabs[0].url]
                }, function () { });
                close();
            });
    });
}

function getSafariTabId(tab) {
    for (var i = 0; i < safari.application.activeBrowserWindow.tabs.length; i++) {
        if (safari.application.activeBrowserWindow.tabs[i] == tab) {
            return i
        }
    }
}

function getStatusCallback(object) {
    mpJQ('#status-bar .status > span').hide();
    console.log(object)

    mpJQ('#btn-select-credential-fields').toggleClass('disabled', object.hideCustomCredentials)

    if (object.status.connectedToApp) {  
        mpJQ("#btn-open-app").click(function (e) {
            e.preventDefault();
            messaging({ action: "show_app" }, function () { });
            close();
        });
            mpJQ("#btn-open-app").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_OpenApp"));     
        mpJQ('#app-missing').hide();
        mpJQ("#btn-open-app").css("color","");
        mpJQ("#btn-open-app").css("cursor","");
    }
    // Connection to app established, device connected and unlocked
    if (object.status.deviceUnlocked && object.status.connectedToDevice && object.status.connectedToApp) {
        mpJQ('#device-unlocked').show();
    }
    // Connection to app established, device connected but locked
    else if (!object.status.deviceUnlocked && object.status.connectedToDevice && object.status.connectedToApp) {
        mpJQ('#device-locked').show();
    }
    // Connection to app established, but no device connected
    else if (!object.status.connectedToDevice && object.status.connectedToApp) {
        mpJQ('#device-disconnected').show();
    }
    // No app found
    else if (!object.status.connectedToApp) {
        mpJQ('#app-missing').show();
        mpJQ("#btn-open-app").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_OpenApp")+chrome.i18n.getMessage("PopupStatusHtml_Menu_NoApp"));
        mpJQ("#btn-open-app").css("color","gray");
        mpJQ("#btn-open-app").css("cursor","default");
        mpJQ("#btn-open-app").off();
    }
    // Unknown error
    else {
        mpJQ('#unknown-error').show();
    }

    if (object.blacklisted) {
        mpJQ('#btn-remove-site-from-blacklist').show();
        mpJQ('#btn-add-site-to-blacklist').hide();
    } else {
        mpJQ('#btn-add-site-to-blacklist').show();
        mpJQ('#btn-remove-site-from-blacklist').hide();
    }

}

function updateStatusInfo() {
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            messaging({ action: "get_status", overwrite_tab: tabs[0] }, getStatusCallback);
        });

        if (typeof chrome.notifications.getPermissionLevel == 'function') {
            // Check if notifications are enabled
            chrome.notifications.getPermissionLevel(function (response) {
                if (response == 'denied') {
                    mpJQ("#notifications-disabled").show();
                }
            });
        }
}

function _updateStatusInfo() {
    updateStatusInfo();
    setTimeout(_updateStatusInfo, 1000);
}

function initLocale() {

    // -- Error --
    $("#error-encountered h3:first").text(chrome.i18n.getMessage("PopupStatusHtml_Error_Header"));
    $("#error-message").text(chrome.i18n.getMessage("PopupStatusHtml_Error_Message"));
    $("#error-message-2").text(chrome.i18n.getMessage("PopupStatusHtml_Error_Link"));

    // -- Reconnect --
    $("#reconnect-button h3:first").text(chrome.i18n.getMessage("PopupStatusHtml_Reconnect_Header"));
    $("#need-reconnect-message").text(chrome.i18n.getMessage("PopupStatusHtml_Reconnect_Link"));

    // -- Notifications disabled --
    $("#notifications-disabled h3:first").text(chrome.i18n.getMessage("PopupStatusHtml_Notifications_Header"));
    $("#notifications-disabled-message").text(chrome.i18n.getMessage("PopupStatusHtml_Notifications_Link"));

    // -- Configure --
    $("#not-configured h3:first").text(chrome.i18n.getMessage("PopupStatusHtml_Configure_Header"));
    $("#not-configured-message").text(chrome.i18n.getMessage("PopupStatusHtml_Configure_Link"));

    // -- Update --
    $("#update-available h3:first").text(chrome.i18n.getMessage("PopupStatusHtml_Update_Header"));
    $("#update-available-message").text(chrome.i18n.getMessage("PopupStatusHtml_Update_Link"));

    // -- Menu --
    $("#btn-select-credential-fields").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_SelectCredentials"));
    $("#btn-add-site-to-blacklist a:first").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_AddToBlacklist"));
    $("#btn-remove-site-from-blacklist a:first").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_RemoveFromBlacklist"));
    $("#btn-settings").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_Settings"));
    $("#btn-link").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_Website"));
    $("#btn-open-app").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_OpenApp"));
    $("#btn-report-error").text(chrome.i18n.getMessage("PopupStatusHtml_Menu_ReportIssue"));

    // -- Status bar --
    $("#initial-state").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_CheckStatus"));
    $("#device-unlocked").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_DeviceUnlocked"));
    $("#device-locked").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_DeviceLocked"));
    $("#device-disconnected").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_DeviceDisconnected"));
    $("#app-missing").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_AppMissing"));
    $("#unknown-error").text(chrome.i18n.getMessage("PopupStatusHtml_StatusBar_Unknown"));
}

mpJQ(function () {
    initSettings();
    mpJQ('#status-bar .status > span').hide();
    mpJQ('#initial-state').show();

    _updateStatusInfo();
});