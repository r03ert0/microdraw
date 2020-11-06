/*global Microdraw*/
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

const _dialog = function (el, message) {
  el.innerHTML = message;
  fadeIn(el);
  setTimeout(() => {
    fadeOut(el);
  }, 2000);
};

var ToolSave = { save: (function() {

  const configureValuesToSave = function (sl) {
    var section = Microdraw.ImageInfo[sl];
    var value = {};
    value.Regions = [];
    value.RegionsToRemove = [];

    for(const reg of section.Regions) {
      value.Regions.push({
        path: JSON.parse(reg.path.exportJSON()),
        name: reg.name,
        uid: reg.uid
      });
    }

    for( const uid of section.RegionsToRemove ) {
      value.RegionsToRemove.push(uid);
    }

    return value;
  };

  const _processOneSection = function (sl) {
    if ((Microdraw.config.multiImageSave === false) && (sl !== Microdraw.currentImage)) {

      return;
    }

    // configure value to be saved
    const value = configureValuesToSave(sl);

    // check if the section annotations have changed since loaded by computing a hash
    const h = Microdraw.hash(JSON.stringify(value)).toString(16);
    const section = Microdraw.ImageInfo[sl];

    // if the section hash is undefined, this section has not yet been loaded.
    // Do not save anything for this section
    if( typeof section.Hash === "undefined" || h === section.Hash ) {

      return;
    }

    value.Hash = h;

    const pr = new Promise(async (resolve, reject) => {
      let res, req;
      try {
        req = await fetch('/api', {
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
        res = await req.json();
        console.log("< microdrawDBSave. Successfully saved regions:",
          Microdraw.ImageInfo[sl].Regions.length,
          "section: " + sl.toString(),
          "response:", res
        );
        // update hash
        Microdraw.ImageInfo[sl].Hash = h;
        resolve(sl);
      } catch(err) {
        reject(err);
      }
    });

    return pr;
  };

  const _successFeedback = function (savedSections) {
    const el = Microdraw.dom.querySelector('#saveDialog');
    let message = "";

    if(savedSections.length === 0) {
      message = "No changes to save";
    } else {
      message = "Saving sections: " + savedSections.join(" ");
    }
    _dialog(el, message);
  };

  const _errorFeedback = function (err) {
    const el = Microdraw.dom.querySelector('#saveDialog');
    _dialog(el, "Unable to save. Try again later.");
    console.log(err);
  };

  /**
     * @function microdrawDBSave
     * @desc Save SVG overlay to microdrawDB
     * @returns {void}
     */
  var microdrawDBSave = function () {
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

    console.log(promiseArray);

    Promise.all(promiseArray)
      .then(() => {
        _successFeedback(savedSections);
      })
      .catch((err) => {
        _errorFeedback(err);
      });
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
