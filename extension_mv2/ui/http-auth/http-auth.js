/*
 * HTTP Auth form.
 * 
 * @param isProxy {Boolean}
 * @param proxy {String}
 * @param url {String}
 */

window.data = JSON.parse(decodeURIComponent(window.location.search.slice(1)))

$(function () {
    // Display strings in proper locale
    initLocale();

	// Set url as action attribute of the form, so mcCombs will
	// save credentials for the right url.
	$('.form').attr('action', 
		data.isProxy
		? 'proxy://' + data.proxy
		: data.url
	)
	$('.notice span, .caution p span').text(
		data.isProxy
			? data.proxy
			: new URL(data.url).hostname
	)
	
	$('.form').on('submit', function(event) {
		event.preventDefault();
		
		messaging({
			action: 'http_auth_submit',
			args: [{
				login: $('.form [name="login"]').val(),
				password: $('.form [name="password"]').val()
			}]
		});
		
		window.location.href = data.url
   })
  
   $('#idAuthUrl').text(data.url);
   $('#idDivAddToBlacklist').click(AddToBlacklist);
});

function AddToBlacklist(){
    let blacklist = typeof(localStorage.mpBlacklist) == 'undefined' ? {} : JSON.parse(localStorage.mpBlacklist);
    blacklist[data.url] = true;
    localStorage.mpBlacklist = JSON.stringify(blacklist);
    close();
}

// Unify messaging method - And eliminate callbacks (a message is replied with another message instead)
function messaging( message ) {
	if (content_debug_msg > 4) cipDebug.log('%c Sending message to background:','background-color: #0000FF; color: #FFF; padding: 5px; ', message);
    chrome.runtime.sendMessage( message );
};

function initLocale() {

    $("div.notice").html(chrome.i18n.getMessage("HttpAuthHtml_Authorizing"));
    $("#login").text(chrome.i18n.getMessage("HttpAuthHtml_Input_Login"));
    $("#password").text(chrome.i18n.getMessage("HttpAuthHtml_Input_Password"));
    $("button").text(chrome.i18n.getMessage("HttpAuthHtml_Button_Submit"));
    $("div.caution h6:first").text(chrome.i18n.getMessage("HttpAuthHtml_CautionTitle"));
    $("div.caution p:first").html(chrome.i18n.getMessage("HttpAuthHtml_CautionText"));
};

var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
var content_debug_msg = (!isFirefox && chrome.runtime && !('update_url' in chrome.runtime.getManifest())) ? 55 : false;

var cipDebug = {};
if (content_debug_msg) {
	cipDebug.log = function( message ) {
		this.log( message );
	}
	cipDebug.log = console.log.bind(window.console);
	cipDebug.warn = console.warn.bind(window.console);
	cipDebug.trace = console.trace.bind(window.console);
	cipDebug.error = console.error.bind(window.console);
} else {
	cipDebug.log = function() {}
	cipDebug.log = function() {}
	cipDebug.warn = function() {}
	cipDebug.trace = function() {}
	cipDebug.error = function() {}
}
