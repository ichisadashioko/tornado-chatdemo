jQuery.postJSON = function (url, args, callback) {
    args._xsrf = getCookie("_xsrf");
    $.ajax({
        url: url,
        data: $.param(args),
        dataType: "text",
        type: "POST",
        success: function (response) {
            if (callback) {
                callback(eval("(" + response + ")"));
            }
        },
        error: function (response) {
            console.log("ERROR:", response);
        }
    });
}

jQuery.fn.formToDict = function () {
    var fields = this.serializeArray();
    var json = {}
    for (var i = 0; i < fields.length; i++) {
        json[fields[i].name] = fields[i].value;
    }

    if (json.next) {
        delete json.next;
    }

    return json;
}

jQuery.fn.enable = function (opt_enable) {
    if (arguments.length && !opt_enable) {
        this.attr("disabled", "disabled");
    } else {
        this.removeAttr("disabled");
    }

    return this;
}

jQuery.fn.disable = function () {
    this.enable(false);
    return this;
}

var updater = {
    errorSleepTime: 500,
    cursor: null,
    showMessage: function (message) {
        var existing = $("#m" + message.id);
        if (existing.length > 0) { return; }
        var node = $(message.html);
        node.hide();
        $("#inbox").append(node);
        node.slideDown();
    },
    /**
     * @param {{messages: []}} response
     */
    newMessages: function (response) {
        if (!response.messages) {
            return;
        }

        var messages = response.messages;
        updater.cursor = messages[messages.length - 1].id;
        console.log(messages.length, "new messages, cursor:", updater.curosr);
        for (var i = 0; i < messages.length; i++) {
            updater.showMessage(messages[i]);
        }
    },
    onError: function (response) {
        updater.errorSleepTime *= 2;
        console.log("Poll error; sleeping for", updater.errorSleepTime, "ms");
        window.setTimeout(updater.poll, updater.errorSleepTime);
    },
    onSuccess: function (response) {
        try {
            updater.newMessages(eval("(" + response + ")"));
        } catch (e) {
            updater.onError();
            return;
        }

        updater.errorSleepTime = 500;
        window.setTimeout(updater.poll, 0);
    },
    poll: function () {
        var args = { "_xsrf": getCookie("_xsrf") };
        if (updater.cursor) {
            args.cursor = updater.cursor;
        }

        $.ajax({
            url: "/a/message/updates",
            type: "POST",
            dataType: "text",
            data: $.param(args),
            success: updater.onSuccess,
            error: updater.onError,
        });
    },
}

function newMessage(form) {
    var message = form.formToDict();
    var disabled = form.find("input[type=submit]");
    disabled.disable();
    $.postJSON("/a/message/new", message, function (response) {
        updater.showMessage(response);
        if (message.id) {
            form.parent().remove();
        } else {
            form.find("input[type=text]").val("").select();
            disabled.enable();
        }
    });
}

function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

$(document).ready(function () {
    $("#messageform").on("submit", function () {
        newMessage($(this));
        return false;
    });

    $("#messageform").on("keypress", function (e) {
        if (e.keyCode == 13) {
            newMessage($(this));
            return false;
        }

        return true;
    });

    $("#message").select();
    updater.poll();
});
