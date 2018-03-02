/*******************************************************************************************
  Module:		cipPassword
  Copyright:	(c) 2018
  Created:		02/25/2018 (mm/dd/yyyy)
********************************************************************************************/
var cipPassword = {

    observedIcons: [],
    observingLock: false,

    init: function ()
    {
        if (content_debug_msg > 4) cipDebug.log('%c cipPassword: %c init', 'background-color: #ff8e1b', 'color: #333333');
        if ("initPasswordGenerator" in _called) return;

        _called.initPasswordGenerator = true;

        window.setInterval(function () {
            cipPassword.checkObservedElements();
        }, 400);

        $(window).on('resize', function () {
            cipPassword.checkObservedElements();
        })
    },

    initField: function (field, inputs, pos)
    {
        if (content_debug_msg > 4) cipDebug.log('%c cipPassword: %c initField', 'background-color: #ff8e1b', 'color: #333333', field);
        if (!field || field.length != 1) return;

        if (field.data("mp-password-generator")) return;

        field.data("mp-password-generator", true);

        cipPassword.createIcon(field);
        mpDialog.precreate(inputs, field);

        var $found = false;
        if (inputs) {
            for (var i = pos + 1; i < inputs.length; i++) {
                if (inputs[i] && inputs[i].attr("type") && inputs[i].attr("type").toLowerCase() == "password") {
                    field.data("mp-genpw-next-field-id", inputs[i].data("mp-id"));
                    field.data("mp-genpw-next-is-password-field", (i == 0));
                    $found = true;
                    break;
                }
            }
        }

        field.data("mp-genpw-next-field-exists", $found);
    },

    generatePassword: function ()
    {
        messaging({ action: 'generate_password', args: [cip.settings['usePasswordGeneratorLength']] });
    },

    generatePasswordFromSettings: function (passwordSettings)
    {
        var charactersLowercase = 'abcdefghijklmnopqrstuvwxyz';
        var charactersUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var charactersNumbers = '1234567890';
        var charactersSpecial = '!$%*()_+{}-[]:"|;\'?,./';
        var hash = "";
        var possible = "";
        var length = cip.settings['usePasswordGeneratorLength'];

        if (passwordSettings.settings["usePasswordGeneratorLowercase"]) possible += charactersLowercase;
        if (passwordSettings.settings["usePasswordGeneratorUppercase"]) possible += charactersUppercase;
        if (passwordSettings.settings["usePasswordGeneratorNumbers"]) possible += charactersNumbers;
        if (passwordSettings.settings["usePasswordGeneratorSpecial"]) possible += charactersSpecial;

        for (var i = 0; i < length; i++) {
            hash += possible.charAt(Math.floor(passwordSettings.seeds[i] * possible.length));
        }
        return hash;
    },

    removeLoginIcons: function ()
    {
        var PREFIX = 'mp-ui-login-icon',
            SELECTOR = '.' + PREFIX;

        mpJQ(SELECTOR).remove()
    },

    createLoginIcon: function (field)
    {
        var PREFIX = 'mp-ui-login-icon',
            SELECTOR = '.' + PREFIX;

        // Return if field isn't defined.
        if (!field) return

        // Prevent showing icon if password field is less than 100px by width.
        if (field[0].clientWidth < 100) return

        // Prevent showing icon if password field is hidden by width or height.
        if (field[0].clientWidth < 2 || field[0].clientHeight < 2) return

        // Prevent showing icon if the password field has a tabIndex of -1 
        if (field.prop('tabindex') == -1) return

        if (content_debug_msg > 4) cipDebug.log('%c cipPassword: %c createLoginIcon', 'background-color: #ff8e1b', 'color: #333333', field);

        // Check if there are other icons in the page
        var currentIcons = mpJQ(SELECTOR);
        var iconIndex = currentIcons.length;
        if (iconIndex > 0) {
            for (var I = 0; I < iconIndex; I++) {
                if (field.data("mp-id") === mpJQ(currentIcons[I]).data('mp-genpw-field-id')) { // An icon for this field already exists
                    return
                }
            }
        }

        var $className = (field.outerHeight() > 28)
            ? PREFIX + '__big'
            : PREFIX + '__small';
        var $size = (field.outerHeight() > 28) ? 24 : 16;
        var $offset = Math.floor((field.outerHeight() - $size) / 2);
        $offset = ($offset < 0) ? 0 : $offset;

        var $zIndex = 0;
        var $zIndexField = field;
        var z;
        var c = 0;
        while ($zIndexField.length > 0) {
            if (c > 100 || $zIndexField[0].nodeName == "#document") {
                break;
            }
            z = $zIndexField.css("z-index");
            if (!isNaN(z) && parseInt(z) > $zIndex) {
                $zIndex = parseInt(z);
            }
            $zIndexField = $zIndexField.parent();
            c++;
        }

        if (isNaN($zIndex) || $zIndex < 1) {
            $zIndex = 1;
        }
        $zIndex += 1;

        var iframe = document.createElement('iframe');
        iframe.src = cip.settings['extension-base'] + 'ui/login-icon/login-icon.html?' +
            encodeURIComponent(JSON.stringify({
                type: $size == 16 ? 'small' : 'big',
                iconId: PREFIX + '-' + field.data('mp-id'),
                settings: cip.settings
            }));

        var $icon = $(iframe)
            .attr('id', PREFIX + '-' + field.data('mp-id'))
            .attr('tabindex', -1)
            .addClass(PREFIX)
            .addClass($className)
            .css("z-index", $zIndex)
            .data("size", $size)
            .data("offset", $offset)
            .data("index", iconIndex)
            .data("mp-genpw-field-id", field.data("mp-id"));

        cipPassword.setIconPosition($icon, field);
        cipPassword.observedIcons.push($icon);
        $icon.insertAfter(field);
    },

    createIcon: function (field)
    {
        var PREFIX = 'mp-ui-password-dialog-toggle',
            SELECTOR = '.' + PREFIX;

        // Return if field isn't defined.
        if (!field) return

        // Prevent showing icon if password field is less than 100px by width.
        if (field[0].clientWidth < 100) return

        // Prevent showing icon if password field is hidden by width or height.
        if (field[0].clientWidth < 2 || field[0].clientHeight < 2) return

        // Prevent showing icon if the password field has a tabIndex of -1 
        if (field.prop('tabindex') == -1) return

        if (content_debug_msg > 4) cipDebug.log('%c cipPassword: %c createIcon', 'background-color: #ff8e1b', 'color: #333333', field);

        // Check if there are other icons in the page
        var currentIcons = mpJQ(SELECTOR);
        var iconIndex = currentIcons.length;
        if (iconIndex > 0) {
            for (var I = 0; I < iconIndex; I++) {
                if (field.data("mp-id") === mpJQ(currentIcons[I]).data('mp-genpw-field-id')) { // An icon for this field already exists
                    mpJQ(currentIcons[I]).remove();
                }
            }
        }

        var $className = (field.outerHeight() > 28)
            ? PREFIX + '__big'
            : PREFIX + '__small';
        var $size = (field.outerHeight() > 28) ? 24 : 16;
        var $offset = Math.floor((field.outerHeight() - $size) / 2);
        $offset = ($offset < 0) ? 0 : $offset;

        var $zIndex = 0;
        var $zIndexField = field;
        var z;
        var c = 0;
        while ($zIndexField.length > 0) {
            if (c > 100 || $zIndexField[0].nodeName == "#document") {
                break;
            }
            z = $zIndexField.css("z-index");
            if (!isNaN(z) && parseInt(z) > $zIndex) {
                $zIndex = parseInt(z);
            }
            $zIndexField = $zIndexField.parent();
            c++;
        }

        if (isNaN($zIndex) || $zIndex < 1) {
            $zIndex = 1;
        }
        $zIndex += 1;

        var iframe = document.createElement('iframe');
        iframe.src = cip.settings['extension-base'] + 'ui/password-dialog-toggle/password-dialog-toggle.html?' +
            encodeURIComponent(JSON.stringify({
                type: $size == 16 ? 'small' : 'big',
                iconId: PREFIX + '-' + field.data('mp-id'),
                settings: cip.settings
            }));

        var $icon = $(iframe)
            .attr('id', PREFIX + '-' + field.data('mp-id'))
            .attr('tabindex', -1)
            .addClass(PREFIX)
            .addClass($className)
            .css("z-index", $zIndex)
            .data("size", $size)
            .data("offset", $offset)
            .data("index", iconIndex)
            .data("mp-genpw-field-id", field.data("mp-id"));

        cipPassword.setIconPosition($icon, field);
        cipPassword.observedIcons.push($icon);
        $icon.insertAfter(field);
    },

    onIconClick: function (iconId)
    {
        target = $('#' + iconId)

        if (!target.is(":visible")) {
            target.remove();
            return;
        }

        // Check if the current form has a combination associated to it
        var fieldID = target.data('mp-genpw-field-id');

        var associatedInput = mpJQ('#' + fieldID + ',input[data-mp-id=' + fieldID + ']');
        var containerForm = associatedInput.closest('form');
        var comb = false;

        // Search for combination departing from FORM (probably refactor to be a sole function in mcCombs)
        if (containerForm.length == 0) comb = mcCombs.forms.noform.combination;
        else {
            for (form in mcCombs.forms) {
                if (form === containerForm.prop('id') || form === containerForm.data('mp-id')) { // Match found
                    comb = mcCombs.forms[form].combination;
                }
            }
        }

        mpDialog.toggle(target, comb && comb.isPasswordOnly);
    },

    setIconPosition: function ($icon, $field)
    {
        $icon
            .css("top", $field.position().top + parseInt($field.css('margin-top')) + $icon.data("offset"))
            .css("left", $field.position().left + parseInt($field.css('margin-left')) + $field.outerWidth() - $icon.data("size") - $icon.data("offset"))
    },

    callbackPasswordCopied: function (bool)
    {
        if (bool) {
            mpJQ("#mp-genpw-btn-clipboard").addClass("mp-bt-btn-success");
        }
    },

    callbackGeneratedPassword: function (entries)
    {
        if (entries && entries.length >= 1) {
            mpJQ("#mp-genpw-btn-clipboard:first").removeClass("mp-bt-btn-success");
            mpJQ("input#mp-genpw-textfield-password:first").val(entries[0].Password);
            if (isNaN(entries[0].Login)) {
                mpJQ("#mp-genpw-quality:first").text("??? Bits");
            }
            else {
                mpJQ("#mp-genpw-quality:first").text(entries[0].Login + " Bits");
            }
        }
        else {
            if (mpJQ("div#mp-genpw-error:first").length == 0) {
                mpJQ("button#mp-genpw-btn-generate:first").after("<div style='block' id='mp-genpw-error'>Cannot receive generated password.<br />Is your version of KeePassHttp up-to-date?<br /><br /><a href='https://github.com/pfn/keepasshttp/'>Please visit the KeePassHttp homepage</a></div>");
                mpJQ("input#mp-genpw-textfield-password:first").parent().hide();
                mpJQ("button#mp-genpw-btn-generate").hide();
                mpJQ("button#mp-genpw-btn-clipboard").hide();
                mpJQ("button#mp-genpw-btn-fillin").hide();
            }
        }
    },

    onRequestPassword: function ()
    {
        chrome.runtime.sendMessage({
            'action': 'generate_password'
        }, cipPassword.callbackGeneratedPassword);
    },

    checkObservedElements: function ()
    {
        if (typeof (mpJQ) === 'undefined') return;
        if (cipPassword.observingLock) {
            return;
        }

        cipPassword.observingLock = true;
        mpJQ.each(cipPassword.observedIcons, function (index, iconField) {
            if (iconField && iconField.length == 1) {
                var fieldId = iconField.data("mp-genpw-field-id");
                var field = mpJQ("input[data-mp-id='" + fieldId + "']:first");
                if (!field || field.length != 1) {
                    iconField.remove();
                    cipPassword.observedIcons.splice(index, 1);
                }
                else if (!field.is(":visible")) {
                    iconField.hide();
                }
                else if (field.is(":visible")) {
                    iconField.show();
                    cipPassword.setIconPosition(iconField, field);
                    field.data("mp-password-generator", true);
                }
            }
            else {
                cipPassword.observedIcons.splice(index, 1);
            }
        });
        cipPassword.observingLock = false;
    }
};