/* global Microdraw */
/*global $*/

const fadeOut = function (el) {
  el.style.opacity = 1;

  (function fade() {
    if ((el.style.opacity -= 0.1) < 0) {
      el.style.display = "none";
    } else {
      requestAnimationFrame(fade);
    }
  }());
};

const fadeIn = function (el) {
  el.style.opacity = 0;
  el.style.display = "block";

  (function fade() {
    var val = parseFloat(el.style.opacity);
    if (!((val += 0.1) > 1)) {
      el.style.opacity = val;
      requestAnimationFrame(fade);
    }
  }());
};

const _dialog = async ({el, message, doFadeOut=true, delay=2000, background="#333"}) => {
  if(typeof doFadeOut === "undefined") {
    doFadeOut = true;
  }

  el.innerHTML = message;
  el.style.background = background;
  fadeIn(el);
  await new Promise((resolve) => {
    setTimeout(() => {
      if(doFadeOut) {
        fadeOut(el);
      }
      resolve();
    }, delay);
  });
};

window.ToolSave = { save: (function() {

  // eslint-disable-next-line max-statements
  const _processOneSection = async function (sl) {
    if ((Microdraw.config.multiImageSave === false) && (sl !== Microdraw.currentImage)) {

      return;
    }

    // configure value to be saved
    var section = Microdraw.ImageInfo[sl];
    const value = Microdraw.sectionValueForHashing(section);
    const h = Microdraw.hash(JSON.stringify(value)).toString(16);

    // check if the section annotations have changed since loaded by computing a hash
    // if the section hash is undefined, this section has not yet been loaded.
    // Do not save anything for this section
    if( typeof section.Hash === "undefined" || h === section.Hash ) {

      return;
    }

    value.Hash = h;

    const res = await fetch('/api', {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'save',
        source: Microdraw.source,
        slice: sl,
        project: Microdraw.project,
        Hash: h,
        annotation: JSON.stringify(value)
      })
    });

    if (!res.ok) {
      throw await res.json();
    }

    // update hash
    section.Hash = h;

    return sl;
  };

  const _savingFeedback = async function (savedSections) {
    const el = Microdraw.dom.querySelector('#saveDialog');
    let message = "";

    if(savedSections.length === 0) {
      message = "No changes to save";
      await _dialog({el, message});
    } else {
      message = "Saving sections: " + savedSections.join(" ");
      await _dialog({el, message, doFadeOut: false});
    }
  };

  const _successFeedback = function () {
    const el = Microdraw.dom.querySelector('#saveDialog');
    _dialog({el, message: "Successfully saved", delay: 1000, background: "#2a3"});
  };

  const _errorFeedback = function (err) {
    const el = Microdraw.dom.querySelector('#saveDialog');
    _dialog({el, message: "Unable to save, try again later", background: "#d34"});
    console.log(err);
  };

  /**
     * @function microdrawDBSave
     * @desc Save SVG overlay to microdrawDB
     * @returns {void}
     */
  var microdrawDBSave = async function () {
    if( Microdraw.debug ) {
      console.log("> save promise");
    }

    var promiseArray = [];
    var savedSections = [];

    // eslint-disable-next-line max-statements
    Object.keys(Microdraw.ImageInfo).forEach((sl) => {
      const pr = _processOneSection(sl);
      if(pr) {
        console.log("pushing POST promise");
        promiseArray.push(pr);
        savedSections.push(sl);
      }
    });

    await _savingFeedback(savedSections);

    if(promiseArray.length > 0) {
      Promise.all(promiseArray)
        .then(() => {
          _successFeedback();
        })
        .catch((err) => {
          _errorFeedback(err);
        });
    }
  };

  var tool = {

    /**
         * @function click
         * @desc save the annotations
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    click : function click(prevTool) {
      Microdraw.selectRegion( null );
      microdrawDBSave();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};

/**
 * @function microdrawDBLoad
 * @desc Load SVG overlay from microdrawDB
 * @returns {Promise} A promise to return an array of paths of the current section.

 */
Microdraw.microdrawDBLoad = function() {
  return new Promise((resolve, reject) => {
    if( Microdraw.debug ) {
      console.log("> save.js microdrawDBLoad promise");
    }
    const query = {
      action : "load_last",
      source : Microdraw.source,
      slice: Microdraw.currentImage
    };
    if(typeof Microdraw.project !== 'undefined') {
      query.project = Microdraw.project;
    }
    $.getJSON('/api', query)
      .success(function (data) {
        Microdraw.annotationLoadingFlag = false;

        // Because of asynchrony, the section that just loaded may not be the one that the user
        // intended to get. If the section that was just loaded does not correspond to the current section,
        // do not display this one and load the current section.
        if( Microdraw.section !== Microdraw.currentImage ) {
          console.log("> save.js microdrawDBLoad: Loaded section does not correspond with the current section.");
          Microdraw.microdrawDBLoad()
            .then(resolve)
            .catch(reject);

        } else if( $.isEmptyObject(data) ) {
          Microdraw.ImageInfo[Microdraw.currentImage].Hash = Microdraw.hash(JSON.stringify(Microdraw.ImageInfo[Microdraw.currentImage].Regions)).toString(16);
          if( Microdraw.debug ) {
            console.log("< save.js microdrawDBLoad: returned data is an empty object");
          }
          resolve([]);
        } else {
          resolve(data);
        }
      })
      .error(function(jqXHR, textStatus, err) {
        console.log("< microdrawDBLoad resolve ERROR: " + textStatus + " " + err);
        Microdraw.annotationLoadingFlag = false;
        reject(err);
      });
  });
};
