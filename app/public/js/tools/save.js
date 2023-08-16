/* global Microdraw */
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

  const _processOneSection = async function (query) {
    const sl = query.slice;

    const res = await fetch('/api', {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!res.ok) {
      throw await res.json();
    }

    // update hash
    Microdraw.ImageInfo[sl].Hash = query.Hash;

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

    Object.keys(Microdraw.ImageInfo).forEach((sl) => {
      if ((Microdraw.config.multiImageSave) || (sl === Microdraw.currentImage)) {
        // configure value to be saved
        var section = Microdraw.ImageInfo[sl];
        const value = Microdraw.sectionValueForHashing(section);
        const h = Microdraw.hash(JSON.stringify(value)).toString(16);

        // check if the section annotations have changed since loaded by computing a hash
        // if the section hash is undefined, this section has not yet been loaded.
        // Do not save anything for this section
        if (typeof section.Hash !== "undefined" && h !== section.Hash) {
          value.Hash = h;
          const query = {
            action: 'save',
            source: Microdraw.source,
            slice: sl,
            project: Microdraw.project,
            Hash: h,
            annotation: JSON.stringify(value)
          };

          console.log("pushing POST promise");
          promiseArray.push(_processOneSection(query));
          savedSections.push(sl);
        }
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
