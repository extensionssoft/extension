/*
 * Moolticute support for Mooltipass browser extension
 * (c) Raoul Hecky
 */

if ( typeof background_debug_msg === 'undefined') background_debug_msg = false;

var moolticute = moolticute || {};

moolticute.status = {
    connected: false,
    unlocked: false,
    version: {
        flash_size: 0,
        hw_version: '0'
    },
    state: 'unknown',           //state for mooltipass ext compat
    realState: 'unknown',
    middleware: 'unknown',
    middleware_version: 'unknown'
}

moolticute.connectedToDaemon = false;

// Keep pending requests here until they get reponses
moolticute._qCallbacks = {};

//create a unique id to map requests to responses
moolticute._currCallbackId = 0;

// moolticute protocol version
moolticute._protocolVersion = "1.0"

/*
    Allows to have a delayed response
    Set to false for normal operation or timeout in millisecs
*/
moolticute.delayResponse = false;


moolticute.resetCurrentStatus = function()
{
    moolticute.status = {
        connected: false,
        unlocked: false,
        version: {
            flash_size: 0,
            hw_version: '0'
        },
        state: 'unknown',       //state for mooltipass ext compat
        realState: 'unknown',
        middleware: 'unknown',
        middleware_version: 'unknown'
    }
}

moolticute._getCallbackId = function() {
    moolticute._currCallbackId += 1;
    if (moolticute._currCallbackId > 1000000) {
        moolticute._currCallbackId = 0;
    }
    return moolticute._currCallbackId;
}

/**
 * Ask for a password
 */
moolticute.askPassword = function( request ) {
    if (background_debug_msg > 4) mpDebug.log('%c Moolticute asking for password', mpDebug.css('FFC6A0'));
    var id = moolticute._getCallbackId();

    var context = '';
    if( request.subdomain && request.domain ) {
        context = request.subdomain + '.' + request.domain;
        subcontext = request.domain;
    } else {
        context = request.domain;
        subcontext = null;
    }

    var message = {
        msg: 'ask_password',
        client_id: id,
        data: {
            extension_version: moolticute._protocolVersion,
            service: context,
            fallback_service: subcontext,
            login: '',
            request_id: request.reqid //this id is for a potential cancel of this request
        }
    };

    if (background_debug_msg > 4) mpDebug.log('%c About to send to moolticuted:', mpDebug.css('FFC6A0'), message);
    moolticute.websocket.send(JSON.stringify(message));
}

/**
 * Ask for a TOTP Code
 */
moolticute.askTOTPCode = function(sDomain, sLogin) {

    let message = {
        msg: 'get_totp_code',
        data: {
            service : sDomain,
            login : sLogin			
        }	
    };			
    moolticute.websocket.send(JSON.stringify(message));	
}

/**
 + * Get random numbers
 + */
 moolticute.getRandomNumbers = function() {
    if (background_debug_msg > 4) mpDebug.log('%c Moolticute getRandomNumbers', mpDebug.css('FFC6A0'));
    var id = moolticute._getCallbackId();

    moolticute.websocket.send(JSON.stringify({
        msg: 'get_random_numbers',
        client_id: id
    }));
 }

/* Signal moolticute to show a status notification if needed */
moolticute.sendStatusNotificationTrigger = function() {
    moolticute.websocket.send(JSON.stringify({"msg":"show_status_notification_warning", "data":{}}));
}

/* Raw send request */
moolticute.sendRequest = function( request ) {
    if (background_debug_msg > 4) mpDebug.log('%c Moolticute sendRequest', mpDebug.css('FFC6A0'), request);
    if ( request.update ) {
        var message = {
            "msg": "set_credential",
            "data": {
                "extension_version": moolticute._protocolVersion,
                "service": request.update.context,
                "login": request.update.login,
                "password": request.update.password,
                "description": 'None'
            }
        };

        moolticute.websocket.send(JSON.stringify( message ));
    } else {
        moolticute.websocket.send(JSON.stringify( request ));
    }
}


moolticute.cancelRequest = function( reqid, domain, subdomain ) {
    // TODO: need to clean up the Callbacks otherwise it might get crowded here.
    if (background_debug_msg > 4) mpDebug.log('%c Moolticute Cancel Request', mpDebug.css('FFC6A0'), reqid);

    moolticute.websocket.send(JSON.stringify({
        'msg': 'cancel_request',
        'data': {
            'request_id': reqid //this id is the one that was sent with ask_password
        }
    }));
}

/* Simple event listener for events sent by moolticute
 + */
moolticute.on = function(type, method, scope) {
     var listeners, handlers;

     if (!(listeners = this.eventListeners)) {
         listeners = this.eventListeners = {};
     }
     if (!(handlers = listeners[type])) {
         handlers = listeners[type] = [];
     }
     //old before MV3	 
     //scope = (scope? scope:window);
     scope = (scope? scope:self);	 
     handlers.push({
         method: method,
         scope: scope
     });
}

moolticute.fireEvent = function(type, data) {
     var listeners, handlers, i, n, handler, scope;
     if (!(listeners = this.eventListeners)) {
         return;
     }
     if (!(handlers = listeners[type])) {
         return;
     }

     for (i = 0;i < handlers.length;i++) {
         handler = handlers[i];
         handler.method.call(handler.scope, type, data);
     }
}

moolticute.on('statusChange', function(type, data) {
    if (background_debug_msg > 4) mpDebug.log('%c Moolticute statusChange event received', mpDebug.css('FFC6A0'));
    if ( moolticute.connectedToDaemon ) {
        mooltipass.device._status = {
            'connected': moolticute.status.connected,
            'unlocked': moolticute.status.unlocked,
            'version': moolticute.status.version,
            'state' : moolticute.status.state
        };    
    }
    
    mooltipass.connectedToApp = !moolticute.connectedToDaemon;
});

// Encapsulation for websocket
moolticute.websocket = {
    tries: 0,
    debug: false,
    _ws: false,
    onOpen: function() {
        if (background_debug_msg > 2) mpDebug.log('%c Moolticute daemon connected', mpDebug.css('FFC6A0'));
        mooltipass.device.switchToExternalApp();
        moolticute.connectedToDaemon = true;
        //moolticute.fireEvent('statusChange');

        this.tries = 0;
    },
    onClose: function( event  ) {
        if (background_debug_msg > 2) mpDebug.log('%c Moolticute daemon disconnected', mpDebug.css('FFC6A0'), this);

        mooltipass.device.switchToInternalApp();
        moolticute.connectedToDaemon = false;        
        moolticute.status.unlocked = false;
        moolticute.resetCurrentStatus();
        //moolticute.fireEvent('statusChange');

        this.tries = this.tries > 3?this.tries:this.tries + 1;

        setTimeout( function() {
            this.connect();
        }.bind(this), this.tries * 1000 );
    },
    onMessage: function( event ) {
        var data = event.data;
        try {
            var recvMsg = JSON.parse(data);
            if (background_debug_msg > 4 && recvMsg.command !== 'getMooltipassStatus') mpDebug.log('%c Moolticute Received message: ', mpDebug.css('FFC6A0'), recvMsg );
            else if (background_debug_msg > 5) mpDebug.log('%c Moolticute Received message: ', mpDebug.css('FFC6A0'), recvMsg );
        }
        catch (e) {
            if (background_debug_msg > 4) mpDebug.log('%c Moolticute Error in received message: ', mpDebug.css('FFC6A0'), e, d );
            return;
        }

        // Translate message to what device.js message parser can understand
        recvMsg = this.messageTranslator( recvMsg );

        // Create wrapper
        var wrapped = {};

        switch(recvMsg.msg ) {
            case 'device_status':
                wrapped.deviceStatus = recvMsg.data;
                break;
            case 'mp_connected':
                moolticute.status.connected = true;
                wrapped.deviceStatus = moolticute.status;
                break;
            case 'mp_disconnected':
                moolticute.status.connected = false;
                moolticute.status.state = 'NotConnected';
                wrapped.deviceStatus = moolticute.status;
                break;
            case 'param_changed':
                break;
            case 'status_changed':
                moolticute.status.unlocked = recvMsg.data == 'Unlocked';
                moolticute.status.realState = recvMsg.data;
                moolticute.status.state = recvMsg.data;

                //Keep compatibility with mooltipass chrome App
                if (recvMsg.data == 'NoCardInserted' || recvMsg.data == 'UnkownSmartcad') {
                    moolticute.status.state = 'NoCard';
                } else if (recvMsg.data == 'LockedScreen') {
                    moolticute.status.state = 'Locked';
                }
                wrapped.deviceStatus = moolticute.status;
                break;
            case 'ask_password':
                if ( recvMsg.data.failed == true ) wrapped.noCredentials = true;
                else {
                    wrapped.credentials = {
                        login: recvMsg.data.login,
                        password: recvMsg.data.password,
                    };
                }
                break;
            case 'get_totp_code':
                wrapped.totpcode = recvMsg.data.totp_code;			
                break;	
            case 'version_changed':
                moolticute.status.version = recvMsg.data;
                wrapped.deviceStatus = moolticute.status;
                break;
            case 'set_credential':
                wrapped.updateComplete = true;
                break;
            case 'get_random_numbers':
                wrapped.random = recvMsg.data;
                break;
            case 'get_application_id':
                moolticute.status.middleware = recvMsg.data.application_name;
                moolticute.status.middleware_version = recvMsg.data.application_version;
                wrapped.deviceStatus = moolticute.status;
            case 'show_app':
                // Just discard response, as we don't need it.
                break;
            default:
                if (background_debug_msg > 1) mpDebug.log('%c Unknown message:  ', mpDebug.css('FFC6A0'), recvMsg.msg, recvMsg  );
        }
        
        mooltipass.device.messageListener( wrapped );
        return;
    },
    send: function( message ) {
        if (background_debug_msg > 4) mpDebug.log('%c Moolticute Send message: ', mpDebug.css('FFC6A0'), message );
        this._ws.send( message );
    },
    connect: function() {
        if (background_debug_msg > 4) mpDebug.log('%c Moolticute Connect', mpDebug.css('FFC6A0') );
        this._ws = new WebSocket( 'ws://127.0.0.1:30035' );
        this._ws.onopen = this.onOpen.bind(this);
        this._ws.onclose = this.onClose.bind(this);
        this._ws.onmessage = this.onMessage.bind(this);
    },
    /* Translate messages received from MooltiApp to MooltiCute format */
    messageTranslator: function( msg ) {
        var output = { data: {} };
        if ( msg.deviceStatus ) {
            output.msg = 'device_status';
            output.data = msg.deviceStatus;
            moolticute.status.connected = msg.deviceStatus.connected;
            moolticute.status.unlocked = msg.deviceStatus.unlocked;
            moolticute.status.version = {hw_version: msg.deviceStatus.version};
            moolticute.status.state = msg.deviceStatus.state;
            moolticute.status.middleware = msg.deviceStatus.middleware;
        } else if ( msg.command && msg.command == 'getCredentials' ) {
            output.msg = 'ask_password';
            output.data.failed = msg.success?false:true;
            if ( msg.success ) {
                output.data.login = msg.credentials.login;
                output.data.password = msg.credentials.password;    
            }
        } else if (msg.totpcode) {
            output.msg = 'get_totp_code';
            output.data.totpcode = msg.totpcode;
        } else if ( msg.command && msg.command == 'getRandomNumber') {
            output.msg = 'get_random_numbers';
            output.data = msg.random;
        } else if ( msg.command && msg.command == 'getMooltipassStatus') {
            output.msg = 'status_changed';
            if ( msg.value == 'unlocked' ) output.data = 'Unlocked';
            moolticute.status.connected = msg.connected;

            // Asume Moolticute if no middleware message
            moolticute.status.middleware = msg.middleware?msg.middleware:'Moolticute';
        } else {
            output = msg;    
        }
        
        return output;
    }
};
/* First call to connect */
setTimeout(function() {if(!mooltipass.device.emulation_mode) moolticute.websocket.connect();}, 1000);
