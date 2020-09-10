// ==UserScript==
// @name         Netflix Subtitles Interceptor
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Jiaming Zhang
// @match        https://www.netflix.com/watch/*
// @grant        none
// ==/UserScript==

function isShortcutPressed(e) {
    return e.code === "Numpad5" && e.ctrlKey
}

// Inspired by https://medium.com/lingua-materna/how-to-download-subtitles-for-foreign-language-movies-on-netflix-44a848acdd12
(function() {
  'use strict';

  // https://stackoverflow.com/questions/5202296/add-a-hook-to-all-ajax-requests-on-a-page
  function addXMLRequestCallback(callback) {
    var oldSend, i;
    if (XMLHttpRequest.callbacks) {
      // we've already overridden send() so just add the callback
      XMLHttpRequest.callbacks.push(callback);
    } else {
      // create a callback queue
      XMLHttpRequest.callbacks = [callback];
      // store the native send()
      oldSend = XMLHttpRequest.prototype.send;
      // override the native send()
      XMLHttpRequest.prototype.send = function() {
        // process the callback queue
        // the xhr instance is passed into each callback but seems pretty useless
        // you can't tell what its destination is or call abort() without an error
        // so only really good for logging that a request has happened
        // I could be wrong, I hope so...
        // EDIT: I suppose you could override the onreadystatechange handler though
        for (i = 0; i < XMLHttpRequest.callbacks.length; i++) {
          XMLHttpRequest.callbacks[i](this);
        }
        // call the native send()
        oldSend.apply(this, arguments);
      }
    }
  }

  // https://stackoverflow.com/questions/37314820/set-filename-when-downloading-a-file-through-javascript
  function saveContent(fileContents, fileName) {
    var link = document.createElement('a');
    link.download = fileName;
    link.href = 'data:,' + fileContents;
    link.click();
  }

  function isSubstitleUrl(xhr) {
    // xhr.responseURL is empty until the readyState becomes xhr.HEADERS_RECEIVED
    return xhr.readyState === xhr.HEADERS_RECEIVED && xhr.responseURL && xhr.responseURL.indexOf('/?o=') >= 0;
  }

  addXMLRequestCallback(function(xhr) {
    const oldOnreadystatechange = xhr.onreadystatechange;
    xhr.onreadystatechange = (event) => {
      if (oldOnreadystatechange) {
        oldOnreadystatechange.apply(this, arguments);
      }
      if (isSubstitleUrl(xhr)) {
        const showName = document.querySelector("h3.title").textContent;
        const episodeName = document.querySelector("h4.playable-title").textContent;
        xhr.onloadend = (event) => {
          document.onkeypress = (e) => {
            if (isShortcutPressed(e)) {
              saveContent(xhr.responseText, `${showName} ${episodeName}.xml`);
            }
          }
        }
      }
    };
  });
})();
