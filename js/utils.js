/*
 * Webfejlesztés 2. (ELTE-IK)
 * Első beadandó feladat (JavaScript)
 * utils.js - segédfüggvények az alkalmazáshoz
 *
 * Készítette: Keszei Ábel
 * Utolsó módosítás: 2016. 05. 14.
 * Frissítve a második beadandó feladathoz
 *
 * Felhasznált eszközök:
 * - is.js (részben): https://github.com/arasatasaygin/is.js/
 */

// querySelector és querySelectorAll rövidítése
function $(element){
    return document.querySelector(element);
}

function $$(element){
    return document.querySelectorAll(element);
}

// intervallumba eső véletlen generálása
function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// computed style / current style lekérdezés
function currentStyle(elem) {
    if (elem.currentStyle)
        return elem.currentStyle;
    else if (window.getComputedStyle)
        return window.getComputedStyle(elem, null);
}

// objektumok klónozása
function clone(obj){
    if (obj == null || typeof(obj) != 'object')
        return obj;

    var temp = new obj.constructor();
    for (var key in obj)
        temp[key] = clone(obj[key]);

    return temp;
}

// hack eseménykezelők eltávolítására
function removeEventListeners(e) {
    var clone = e.cloneNode();
    while (e.firstChild) {
        clone.appendChild(e.lastChild);
    }
    e.parentNode.replaceChild(clone, e);
}

// XMLHttpRequest objektum előállítása
function getXHR() {
    var xhr = null;
    try {
        xhr = new XMLHttpRequest();
    } catch (e) {
        try {
            xhr = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
                xhr = null;
            }
        }
    }
    return xhr;
}

// AJAX
function ajax(opts) {
    var method   = opts.method || "GET";
    var url      = opts.url || "";
    var getdata  = opts.getdata || "";
    var postdata = opts.postdata || "";
    var success  = opts.success || function(){};
    var error    = opts.error || function(){};

    method = method.toUpperCase();
    url = url + '?' + getdata;
    var xhr = getXHR();
    xhr.open(method, url, true);
    if (method == "POST") {
        xhr.setRequestHeader(
            'Content-Type',	'application/x-www-form-urlencoded'
        );
    }
    xhr.addEventListener('readystatechange', function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                } catch (e) {}

                if (resp === undefined)
                    error();
                else
                    success(resp);
            } else {
                error();
            }
        }
    });
    xhr.send(method == "POST" ? postdata : null);
    return xhr;
}

// objektum -> url konvertáló
function urlString(obj) {
    var str = "";

    for (var i in obj)
        str += (str.length == 0 ? "" : "&") + i + "=" + obj[i];

    return str;
}

// Böngésző felismerő is.js alapján
// (https://github.com/arasatasaygin/is.js/blob/master/is.js)
var browserDetect = {
    userAgent: 'navigator' in window && 'userAgent' in navigator && navigator.userAgent.toLowerCase() || '',
    vendor: 'navigator' in window && 'vendor' in navigator && navigator.vendor.toLowerCase() || '',

    isFirefox: function() {
        return /firefox/i.test(this.userAgent);
    },

    isChrome: function() {
        return /chrome|chromium/i.test(this.userAgent) && /google inc/.test(this.vendor);
    },

    isEdge: function() {
        return /edge/i.test(this.userAgent);
    },

    isIE: function(version) {
        if (!version) {
            return /msie/i.test(this.userAgent) || "ActiveXObject" in window;
        }
        if (version >= 11) {
            return "ActiveXObject" in window;
        }

        return new RegExp('msie ' + version).test(this.userAgent);
    },

    isOpera: function() {
        return /^Opera\//.test(this.userAgent) || /\x20OPR\//.test(this.userAgent);
    },

    isSafari: function() {
        return /safari/i.test(this.userAgent) && /apple computer/i.test(this.vendor);
    }
};