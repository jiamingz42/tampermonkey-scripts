// ==UserScript==
// @name         LingQ Import Timestamp Control Panel
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Jiaming Zhang (https://github.com/z-jason)
// @match        https://www.lingq.com/en/learn/ja/import/contents/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/underscore@1.11.0/underscore-min.js
// ==/UserScript==
// SHOULD REMOVE BEGIN

const _ = {};

function jQuery() {
  return {
    on: () => ({}),
    appendTo: () => ({}),
    append: () => jQuery(),
    attr: () => jQuery(),
    data: () => ({}),
  }
};

(function() {
  const assert = require('assert').strict;

  assert.equal(convertTimeStrToMilliseconds("00:00.1"), 100);
  assert.equal(convertTimeStrToMilliseconds("00:00.100"), 100);
  assert.equal(convertTimeStrToMilliseconds("00:00.1234"), 123);
  assert.equal(convertTimeStrToMilliseconds("00:02"), 2000);
  assert.equal(convertTimeStrToMilliseconds("00:02.1"), 2100);

  assert.equal(adjustTimestamp("00:00.1", 0.1), "00:00.2");
  assert.equal(adjustTimestamp("00:00.2", 0.1), "00:00.3");
  assert.equal(adjustTimestamp("00:00.7", 0.1), "00:00.8");
})();

// SHOULD REMOVE END

// Example: timeString: "00:01", "00:01.02"
function convertTimeStrToMilliseconds(timeString) {
  const [minutesString, secondsString] = timeString.split(":");
  return parseInt(minutesString) * 60 * 1000 + Math.round(parseFloat(secondsString) * 1000);
}

function convertTimeFloatToStr(totalSeconds) {
  const min = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const sec = (totalSeconds % 60).toString();

  const [secInt, secFloat] = sec.split(".");

  let finalSec = secInt.padStart(2, "0");
  if (secFloat) {
    finalSec += `.${secFloat.slice(0,3)}`;
  }
  return `${min}:${finalSec}`;
}

function adjustTimestamp(currTimestampStr, adjustSeconds) {
  const adjustMilliseconds = Math.round(adjustSeconds * 1000);
  const currMilliseconds = convertTimeStrToMilliseconds(currTimestampStr);
  const newMilliseconds = Math.max(0, currMilliseconds + adjustMilliseconds);
  return convertTimeFloatToStr(newMilliseconds / 1000);
}


(function(jQuery, _) {
  'use strict';

  const styleTag = jQuery(`<style>
    button.timestamp-control {
      font-size: 12px;
      margin-left: 8px;
      padding: 5px;
    }
    button.timestamp-control:first-child {
      margin-left: 15px;
    }
    </style>`)
  jQuery('html > head').append(styleTag);
  jQuery("<div style='margin-top:5px'></div>")
    .attr("class", "row")
    .append(makeButton("PLAY").attr("class", "timestamp-control play-pause-button"))
    .append(makeButton("-0.5").attr("class", "timestamp-control adjust-time").data("adjust-time", -0.5))
    .append(makeButton("-0.1").attr("class", "timestamp-control adjust-time").data("adjust-time", -0.1))
    .append(makeButton("+0.1").attr("class", "timestamp-control adjust-time").data("adjust-time", +0.1))
    .append(makeButton("+0.5").attr("class", "timestamp-control adjust-time").data("adjust-time", +0.5))
    .append(makeButton("+2").attr("class", "timestamp-control adjust-time").data("adjust-time", +2))
    .appendTo(jQuery("li.clip"));

  function makeButton(buttonText) {
    return jQuery(`<button type='button'>${buttonText}</button>`);
  }

  function findTimestampFromButton(button) {
    return jQuery(button).closest(".clip").find(".audio-form input");
  }

  jQuery("body").on("click", "button.play-pause-button", function(event) {
    const target = event.target;
    const audio = jQuery("audio")[0];
    if (target.textContent === "PLAY") {
      const startTimeString = findTimestampFromButton(target).val();
      const endTimeString = jQuery(target.closest(".clip").next())
        .find(".audio-form input")
        .val();
      const audioBaseUrl = audio.src.split("#")[0];
      audio.src = `${audioBaseUrl}#t=${startTimeString},${endTimeString}`;
      audio.play();
      target.textContent = "STOP";

      const intervalId = setInterval(function() {
        if (jQuery("audio")[0].paused) {
          clearInterval(intervalId);
          target.textContent = "PLAY";
        }
      }, 200);
    } else {
      audio.pause();
      audio.load();
      target.textContent = "PLAY";
    }
  });

  jQuery("body").on("click", "button.adjust-time", function(event) {
    const target = event.target;
    const adjustSeconds = jQuery(target).data("adjust-time");
    const timestampInput = findTimestampFromButton(target);
    timestampInput.val(adjustTimestamp(timestampInput.val(), adjustSeconds));
  });

})(jQuery, _);
