// ==UserScript==
// @name         Set timesstamp in LingQ
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

const jQuery = () => ({
  on: () => ({}),
  appendTo: () => ({})
});

const assert = require('assert').strict;
const fs = require('fs')
const lingqSubtitles = JSON.parse(fs.readFileSync('/Users/jiamingz/Desktop/Media/01/lingq.json', 'utf8'));
const importSubtitles = parseTsv(fs.readFileSync('/Users/jiamingz/Desktop/Media/01/Terrance_House.tsv', 'utf8'));
const mappings = createMappings(importSubtitles, lingqSubtitles);

assert.equal(importSubtitles.length, mappings.flatMap(m => m.from).length);
assert.equal(lingqSubtitles.length, mappings.map(m => m.to.length == 1 ? 1 : (m.to[1] - m.to[0])+1).reduce((a,b) => a+b, 0));
// SHOULD REMOVE END

function extractDuration(field) {
  const REGEX_SOUND = /\[sound:.*_(\d.\d{2}\.\d{2}\.\d{3})-(\d.\d{2}\.\d{2}\.\d{3})\.mp3\]/g;
  const match = REGEX_SOUND.exec(field);
  if (!match) {
    console.log(field);
    return;
  }
  const start = match[1];
  const end = match[2];
  return convertToSeconds(end) - convertToSeconds(start);
}

function convertToSeconds(field) {
  const [hours, minutes, seconds, ms] = field
    .split(".")
    .map((v) => parseInt(v));
  return hours * 60 * 60 + minutes * 60 + seconds + ms / 1000;
}

function extractSubtitle(field) {
  const REGEX_SUB = /(<font .*>)?(.*)(<\/font>)?/g;
  const match = REGEX_SUB.exec(field);
  if (!match) {
    console.log(field);
    return;
  }
  return match[2];
}

function parseTsv(tsvText) {
  const lines = tsvText.split("\n");
  const importSubtitles = lines
    .filter((line) => line)
    .map((line) => line.split("\t"))
    .map((fields) => ({
      duration: extractDuration(fields[2]),
      subtitle: extractSubtitle(fields[4]),
    }));
  return importSubtitles;
}

function createMappings(importSubtitles, lingqSubtitles) {
  const mappings = [];
  let [i, j] = [0, 0];
  while (i < importSubtitles.length && j < lingqSubtitles.length) {
    let importSubtitle = normalize(getImportedSub(importSubtitles, i));
    const lingqSubtitle = normalize(lingqSubtitles[j]);

    if (importSubtitle === lingqSubtitle) {
      mappings.push({
        from: [i],
        to: [j]
      });
      i++;
      j++;
      continue;
    }

    if (importSubtitle.startsWith(lingqSubtitle)) {
      const nextLingqSubtitle = normalize(lingqSubtitles[j + 1]);
      if (importSubtitle === lingqSubtitle + nextLingqSubtitle) {
        mappings.push({
          from: [i],
          to: [j, j + 1]
        });
        i++;
        j += 2;
        continue;
      }
    }


    if (lingqSubtitle.startsWith(importSubtitle)) {
      const nextImportSubtitle = normalize(
        getImportedSub(importSubtitles, i + 1)
      );
      if (lingqSubtitle === importSubtitle + nextImportSubtitle) {
        mappings.push({
          from: [i, i + 1],
          to: [j]
        });
        i += 2;
        j++;
        continue;
      }
    }

    if (importSubtitle.startsWith(lingqSubtitle)) {
      const range = matchImportSubWithMultipleLingQSub(importSubtitle, lingqSubtitles, j);
      if (range.length === 0) {
      debugMessageWhenNoMatch(importSubtitles, lingqSubtitles, i, j);
        break;
      }
      mappings.push({
        from: [i],
        to: range
      });
      i++;
      j = range[1] + 1;
      continue;
    }

    debugMessageWhenNoMatch(importSubtitles, lingqSubtitles, i, j);
    break;
  }
  console.log(`[INFO] Successfully created mappings with [i,j] = [${i},${j}]`)
  return mappings;
}

function matchImportSubWithMultipleLingQSub(importSubtitle, lingqSubtitles, startIndex) {
  let curr = startIndex + 1;
  let lingqSubtitleConcat = normalize(lingqSubtitles[startIndex]);
  while (curr < lingqSubtitles.length) {
    lingqSubtitleConcat += normalize(lingqSubtitles[curr]);
    if (importSubtitle === lingqSubtitleConcat) {
      return [startIndex, curr];
    }
    if (importSubtitle.startsWith(lingqSubtitleConcat)) {
      curr++;
      continue;
    }
    return [];
  }
}

function debugMessageWhenNoMatch(importSubtitles, lingqSubtitles, i, j) {
    console.log(`[WARNING] No match:  [i,j] = [${i},${j}]`);
    console.log(importSubtitles[i].subtitle);
    console.log(lingqSubtitles[j]);
    console.log(lingqSubtitles[j + 1]);
    console.log(lingqSubtitles[j + 2]);
}

function normalize(text) {
  return text.replace(/( |　|\n)/g, "").replace(/(？|！|。|“|”)/g, "");
}

function getImportedSub(subtitles, i) {
  const sub = subtitles[i].subtitle;
  return sub ? sub : "～～～";
}


(function(jQuery, _) {
  "use strict";

  function setTimestamps(timestampInputs, timestamps) {
    _.zip(timestampInputs, timestamps).forEach((item) => {
      const input = jQuery(item[0]);
      const ts = item[1];
      input.val(ts);
      input.keypress();
    });
  }



  function processText(importSubtitles, lingqSubtitles) {
    const mappings = createMappings(importSubtitles, lingqSubtitles);

    const timestamps = [];
    let curr = 0;

    mappings.forEach((mapping) => {
      const interval = 0;
      const from = mapping.from;
      const to = mapping.to;

      if (!from || !to) {
        debugger;
        return;
      }

      // #1: [i]     => [j]
      // #2: [i]     => [j, j+1]
      // #3: [i,i+1] => [j]
      if (from.length === 1 && to.length === 1) {
        const importSubtitle = importSubtitles[from[0]];
        const duration = importSubtitle.duration;
        timestamps.push(curr);
        curr += duration + interval;
        return;
      }
      if (from.length === 1 && to.length === 2) {
        const importSubtitle = importSubtitles[from[0]];
        const duration = importSubtitle.duration;
        timestamps.push(curr);
        timestamps.push(curr + duration / 2);
        curr += duration + interval;
        return;
      }

      if (from.length === 2 && to.length === 1) {
        timestamps.push(curr);
        curr +=
          importSubtitles[from[0]].duration +
          interval +
          importSubtitles[from[1]].duration +
          interval;
        return;
      }

      debugger;
    });

    //[importSubtitles,lingqSubtitles]=window.subtitles
    window.subtitles = [importSubtitles, lingqSubtitles];
    window.mappings = mappings;
    window.timestamps = timestamps; // should be length 322

    const timestampInputs = jQuery(".sentence-audio-form input");
    const timestampsString = timestamps.map((ts, i) => {
      if (!ts && ts !== 0) {
        ts = timestamps[i + 1];
      }

      const minutes = Math.floor(ts / 60);
      const seconds = Math.round((ts % 60) * 100) / 100;

      const minutes_s = minutes < 10 ? "0" + minutes : "" + minutes;
      const seconds_s = seconds < 10 ? "0" + seconds : "" + seconds;

      return "" + minutes_s + ":" + seconds_s;
    });
    debugger;
    setTimestamps(timestampInputs, timestampsString);
  }

  const fileInput = jQuery('<input type="file" id="fileInput">');
  fileInput.on("change", function() {
    const reader = new FileReader();
    reader.onload = (event) => {
      const importSubtitles = parseTsv(event.target.result);
      const lingqSubtitles = jQuery(".forms.clip .sentence")
        .map((i, v) => jQuery(v).text())
        .map((_, subtitle) => subtitle.replace(/ /g, ""));
      processText(importSubtitles, lingqSubtitles);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(this.files[0]);
  });
  fileInput.appendTo(jQuery("#content-header"));
})(jQuery, _);
