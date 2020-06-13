/*eslint-env jquery*/
/*eslint no-multi-spaces: ["error", { ignoreEOLComments: true }]*/
/*eslint max-statements: ["error", 80]*/
/*eslint max-lines: ["error", 3000]*/
/*eslint no-alert: "off"*/
/*global paper*/
/*global OpenSeadragon*/
/*global Ontology*/
/*global MUI*/

const Microdraw = (function () {
    var me = {
        debug: 1,
        ImageInfo: {},               // regions, and projectID (for the paper.js canvas) for each sections, can be accessed by the section name. (e.g. me.ImageInfo[me.imageOrder[viewer.current_page()]])
                                     // regions contain a paper.js path, a unique ID and a name
        imageOrder: [],              // names of sections ordered by their openseadragon page numbers
        currentImage: null,          // name of the current image
        prevImage: null,             // name of the last image
        currentLabelIndex: 0,        // current label to use
        region: null,                // currently selected region (one element of Regions[])
        copyRegion: null,            // clone of the currently selected region for copy/paste
        handle: null,                // currently selected control point or handle (if any)
        selectedTool: null,          // currently selected tool
        viewer: null,                // open seadragon viewer
        navEnabled: true,            // flag indicating whether the navigator is enabled (if it's not, the annotation tools are)
        magicV: 1000,                // resolution of the annotation canvas - is changed automatically to reflect the size of the tileSource
        params: null,                // URL parameters
        source: null,                // data source
        section: null,               // section index in a multi-section dataset
        UndoStack: [],
        RedoStack: [],
        mouseUndo: null,             // tentative undo information.
        shortCuts: [],               // List of shortcuts
        newRegionFlag: null,         // true when a region is being drawn
        drawingPolygonFlag: false,   // true when drawing a polygon
        annotationLoadingFlag: null, // true when an annotation is being loaded
        config: {},                  // App configuration object
        isMac: navigator.platform.match(/Mac/i),
        isIOS: navigator.platform.match(/(iPhone|iPod|iPad)/i),
        tolerance: 3,
        counter: 1,
        tap: false,
        currentColorRegion: null,
        tools : {},

        /*
          Region handling functions
        */

        /**
         * @function debugPrint
         * @param {string} msg Message to print to console.
         * @param {int} level Minimum debug level to print.
         * @returns {void}
         */
        debugPrint: function (msg, level) {
          if (me.debug >= level) {
            console.log(msg);
          }
        },

        /**
         * @function regionUID
         * @returns {number} counter Number of regions in the current section.
         */
        regionUID: function () {
          if( me.debug ) {
            console.log("> regionUID");
          }

          me.counter = me.ImageInfo[me.currentImage].Regions.reduce(
            (a, b) => Math.max(a, parseInt(b.uid, 10) + 1), me.counter
          );

          return me.counter;
        },

        /**
         * @function hash
         * @param {string} str String to hash
         * @returns {string} A hash
         */
        hash: function (str) {
          var result = str.split("").reduce(function(a, b) {
            a = ((a<<5)-a) + b.charCodeAt(0);

            return a&a;
          }, 0);

          return result;
        },

        /**
         * @function regionHashColor
         * @desc Produces a color based on a region name.
         * @param {string} name Name of the region.
         * @returns {number} color Default color of the region based on its name.
         */
        regionHashColor: function (name) {
          const color = {};
          let h = me.hash(name);

          // add some randomness
          h = Math.sin(h += 1)*10000;
          h = 0xffffff*(h-Math.floor(h));

          color.red = h & 0xff;
          color.green = (h & 0xff00)>>8;
          color.blue = (h & 0xff0000)>>16;

          return color;
        },

        /**
         * @function regionColor
         * @desc Gets the color for a region based on its name
         * @param {string} name Name of the region.
         * @returns {number} color Color of the region based on its name.
         */
        regionColor: function (name) {
          const color = {};
          for(const {name: rname, value, color: rcolor, url} of me.ontology.labels) {
            if(name === rname) {
              color.red = rcolor[0];
              color.green = rcolor[1];
              color.blue = rcolor[2];

              return color;
            }
          }

          // name not found: assign one based on the name
          return me.regionHashColor(name);
        },

        updateLabelDisplay: function () {
          const {color} = me.ontology.labels[me.currentLabelIndex];
          me.dom.querySelector("#color").style["background-color"] = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        },

          /**
         * @function findRegionByUID
         * @param {number} uid Unique ID of a region.
         * @returns {object} The region corresponding to the given ID
         */
        findRegionByUID: function (uid) {
            me.debugPrint("> findRegionByUID", 1);

            me.debugPrint( "look for uid: " + uid, 2);
            me.debugPrint( "region array lenght: " + me.ImageInfo[me.currentImage].Regions.length, 2 );
            // if( me.debug > 2 ) console.log( me.ImageInfo );

            for( let i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
              if( parseInt(me.ImageInfo[me.currentImage].Regions[i].uid, 10) === parseInt(uid, 10) ) {
                me.debugPrint( "region " + me.ImageInfo[me.currentImage].Regions[i].uid + ": ", 2);
                me.debugPrint( me.ImageInfo[me.currentImage].Regions[i], 2 );

                return me.ImageInfo[me.currentImage].Regions[i];
              }
            }
            console.log("Region with unique ID " + uid + " not found");
        },

        /**
         * @function regionTag
         * @param {string} name Name of the region.
         * @param {number} uid Unique ID of the region.
         * @returns {string} str The color of the region.
         */
        regionTag: function (name, uid) {
            //if( me.debug ) console.log("> regionTag");

            var str;
            var color = me.regionColor(name);
            if( uid ) {
                var reg = me.findRegionByUID(uid);
                var mult = 1.0;
                if( reg ) {
                    mult = 255;
                    color = reg.path.fillColor;
                }
                str = [
                  "<div class='region-tag' id='" + uid + "' style='padding:2px'>",
                  "<img class='eye' title='Region visible' id='eye_" + uid + "' src='/img/eyeOpened.svg' />",
                  "<div class='region-color'",
                  "style='background-color:rgba(",
                  parseInt(color.red*mult, 10),
                  ",",
                  parseInt(color.green*mult, 10),
                  ",",
                  parseInt(color.blue*mult, 10),
                  ",0.67)'></div>",
                  "<span class='region-name'>" + name + "</span>",
                  "</div>"
                ].join(" ");
            } else {
                str = [
                  "<div class='region-tag' style='padding:2px'>",
                  "<div class='region-color'",
                  "style='background-color:rgba(",
                  color.red,
                  ",",
                  color.green,
                  ",",
                  color.blue,
                  ",0.67)'></div>",
                  "<span class='region-name'>" + name + "</span>",
                  "</div>"
                ].join(" ");
            }

            return str;
        },

        /**
         * @function selectRegion
         * @desc Make the region selected
         * @param {object} reg The region to select, or null to deselect allr egions
         * @returns {void}
         */
        selectRegion: function (reg) {
            if( me.debug ) { console.log("> selectRegion"); }

            var i;

            // Select path
            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                if( me.ImageInfo[me.currentImage].Regions[i] === reg ) {
                    reg.path.selected = true;
                    reg.path.fullySelected = true;
                    me.region = reg;
                } else {
                    me.ImageInfo[me.currentImage].Regions[i].path.selected = false;
                    me.ImageInfo[me.currentImage].Regions[i].path.fullySelected = false;
                }
            }
            paper.view.draw();

            // Select region name in list
            [].forEach.call(me.dom.querySelectorAll("#regionList > .region-tag"), function(r) {
                r.classList.add("deselected");
                r.classList.remove("selected");
            });

            // Need to use unicode character for ID since CSS3 doesn't support ID selectors that start with a digit

            if (reg) {

                /* if reg.uid is 2 digit or more, need to separate the digits... ie, if reg.uid == 10, the selector  needs to be #\\31 0 or tag will return null*/
                var tag = me.dom.querySelector("#regionList > .region-tag#\\3" + (reg.uid.toString().length > 1 ? reg.uid.toString()[0] + ' ' + reg.uid.toString().slice(1) : reg.uid.toString()) );

                if(tag) {
                  tag.classList.remove("deselected");
                  tag.classList.add("selected");
                }
            }

            if(me.debug) { console.log("< selectRegion"); }
        },

        /**
         * @function changeRegionName
         * @param {object} reg The entry in the region's array.
         * @param {string} name Name of the region.
         * @returns {void}
         */
        changeRegionName: function (reg, name) {
            if( me.debug ) { console.log("> changeRegionName"); }

            var color = me.regionColor(name);

            // Update path
            reg.name = name;
            reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
            paper.view.draw();

            // Update region tag
            me.dom.querySelector(".region-tag#" + reg.uid + ">.region-name").textContent = name;
            me.dom.querySelector(".region-tag#" + reg.uid + ">.region-color").style['background-color'] = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.67)';
        },

        /**
         * @function toggleRegion
         * @desc Toggle the visibility of a region
         * @param {object} reg The region whose visibility is to toggle
         * @returns {void}
         */
        toggleRegion: function (reg) {
            if( me.region !== null ) {
                if( me.debug ) { console.log("> toggle region"); }

                if( reg.path.fillColor !== null ) {
                    reg.path.storeColor = reg.path.fillColor;
                    reg.path.fillColor = null;

                    reg.path.strokeWidth = 0;
                    reg.path.fullySelected = false;
                    reg.storeName = reg.name;
                    me.dom.querySelector('#eye_' + reg.uid).setAttribute('src', '/img/eyeClosed.svg');
                } else {
                    reg.path.fillColor = reg.path.storeColor;
                    reg.path.strokeWidth = 1;
                    reg.name = reg.storeName;
                    me.dom.querySelector('#eye_' + reg.uid).setAttribute('src', '/img/eyeOpened.svg');
                }
                paper.view.draw();
                me.dom.querySelector(".region-tag#" + reg.uid + ">.region-name").textContent = reg.name;
            }
        },


        /**
         * @function pad
         * @desc Add leading zeros
         * @param {number} number A number
         * @param {length} length The desired length for the resulting string
         * @returns {string} number string padded with zeroes
         */
        pad: function (number, length) {
            var str = String(number);
            while( str.length < length ) { str = '0' + str; }

            return str;
        },

        /**
         * @function annotationStyle
         * @desc Get current alpha & color values for colorPicker display
         * @param {object} reg The selected region.
         * @returns {void}
         */
        annotationStyle: function (reg) {
            if( me.debug ) { console.log(reg.path.fillColor); }

            if( me.region !== null ) {
                if( me.debug ) { console.log("> changing annotation style"); }

                me.currentColorRegion = reg;
                let {alpha} = reg.path.fillColor.alpha;
                me.dom.querySelector('#alphaSlider').value = alpha*100;
                me.dom.querySelector('#alphaFill').value = parseInt(alpha*100, 10);

                var hexColor = '#'
                    + me.pad(( parseInt(reg.path.fillColor.red * 255, 10) ).toString(16), 2)
                    + me.pad(( parseInt(reg.path.fillColor.green * 255, 10) ).toString(16), 2)
                    + me.pad(( parseInt(reg.path.fillColor.blue * 255, 10) ).toString(16), 2);
                if( me.debug ) {
                    console.log(hexColor);
                }

                me.dom.querySelector('#fillColorPicker').value = hexColor;

                if( me.dom.querySelector('#colorSelector').style.display === 'none' ) {

                    /** @todo On show, populate alpha */
                    reg = me.currentColorRegion;
                    alpha = reg.path.fillColor.alpha;
                    me.dom.querySelector('#alphaSlider').value = alpha * 100;
                    me.dom.querySelector('#alphaFill').value = alpha * 100;

                    me.dom.querySelector('#colorSelector').style.display =  'block';
                } else {
                    me.dom.querySelector('#colorSelector').style.display = 'none';
                }
            }
        },

        /**
         * @function newRegion
         * @desc  Create a new region.
         * @param {object} arg An object containing the name of the region (arg.name) and the path of the data (arg.path)
         * @param {number} imageNumber The number of the image section where the region will be created
         * @returns {object} A new region
         */
        newRegion: function (arg, imageNumber) {
            if( me.debug ) {
                console.log("> newRegion");
            }
            var reg = {};

            reg.uid = me.regionUID();
            if( arg.name ) {
                reg.name = arg.name;
            } else {
                // reg.name = `Untitled ${reg.uid}`;
                reg.name = me.ontology.labels[me.currentLabelIndex].name;
            }

            var color = me.regionColor(reg.name);

            if( arg.path ) {
                reg.path = arg.path;
                reg.path.strokeWidth = arg.path.strokeWidth ? arg.path.strokeWidth : me.config.defaultStrokeWidth;
                reg.path.strokeColor = arg.path.strokeColor ? arg.path.strokeColor : me.config.defaultStrokeColor;
                reg.path.strokeScaling = false;
                reg.path.fillColor = arg.path.fillColor ? arg.path.fillColor :'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',' + me.config.defaultFillAlpha + ')';
                reg.path.selected = false;
            }

            if( typeof imageNumber === "undefined" ) {
                imageNumber = me.currentImage;
            }
            // if( imageNumber === me.currentImage ) {
            //     // append region tag to regionList
            //     const regionTag = me.regionTag(reg.name, reg.uid);
            //     var el = me.dom.querySelector(regionTag);
            //     me.dom.querySelector("#regionList").appendChild(el);

            //     // handle single click on computers
            //     el.click(me.singlePressOnRegion);

            //     // handle double click on computers
            //     el.dblclick(me.doublePressOnRegion);

            //     // handle single and double tap on touch devices
            //     /**
            //      * @todo it seems that a click event is also fired on touch devices, making this one redundant
            //      */

            //     el.on("touchstart", me.handleRegionTap);
            // }

            // push the new region to the Regions array
            me.ImageInfo[imageNumber].Regions.push(reg);

            // Select region name in list
            me.selectRegion(reg);

            return reg;
        },

        /**
         * @function removeRegion
         * @desc Remove region from current image
         * @param {object} reg The region is going to be removed by this function
         * @param {number} imageNumber The number of the image where the region will be removed
         * @returns {void}
         */
        removeRegion: function (reg, imageNumber) {
            if( me.debug ) { console.log("> removeRegion"); }

            if( typeof imageNumber === "undefined" ) {
                imageNumber = me.currentImage;
            }

            // remove from Regions array
            me.ImageInfo[imageNumber].Regions.splice(me.ImageInfo[imageNumber].Regions.indexOf(reg), 1);
            // remove from paths
            reg.path.remove();
//             if( imageNumber === me.currentImage ) {
//                 // remove from regionList
//                 var tag = me.dom.querySelector("#regionList > .region-tag#" + reg.uid);
//                 tag.remove();
//             }
        },

        /**
         * @function findRegionByName
         * @desc Find region by its name
         * @param {string} name Name of the region from the ontology list
         * @returns {object} The region
         */
        findRegionByName: function (name) {
            if( me.debug ) { console.log("> findRegionByName"); }

            var i;
            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                if( me.ImageInfo[me.currentImage].Regions[i].name === name ) {
                    return me.ImageInfo[me.currentImage].Regions[i];
                }
            }
            console.log("Region with name " + name + " not found");

            return null;
        },

        /**
         * @function appendRegionTagsFromOntology
         * @param {array} o Array with ontology terms
         * @returns {void}
         */
        appendRegionTagsFromOntology: function (o) {
            if( me.debug ) { console.log("> appendRegionTagsFromOntology"); }

            var i;
            for( i = 0; i < o.length; i += 1 ) {
                if( o[i].parts ) {
                  const el = document.createElement("div");
                  el.textContent = o[i].name;
                  me.dom.querySelector("#regionPicker").appendChild(el);
                  me.appendRegionTagsFromOntology(o[i].parts);
                } else {
                  const tag = me.regionTag(o[i].name);
                  const el = me.dom.querySelector(tag);
                  el.classList.add("ontology");
                  me.dom.querySelector("#regionPicker").appendChild(el);

                  // handle single click on computers
                  el.click(me.singlePressOnRegion);

                  // handle double click on computers
                  el.dblclick(me.doublePressOnRegion);

                  el.on("touchstart", me.handleRegionTap);
                }
            }
        },

        /**
         * @function clickHandler
         * @desc Interaction: mouse and tap: If on a computer, it will send click event; if on tablet, it will send touch event.
         * @param {object} event Event
         * @returns {void}
         */
        clickHandler: function (event) {
            if( me.debug ) { console.log("> clickHandler"); }
            event.stopHandlers = !me.navEnabled;
        },

        /**
         * @function pressHandler
         * @param {object} event Event
         * @returns {void}
         */
        pressHandler: function (event) {
            if( me.debug ) { console.log("> pressHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseDown(event.originalEvent.layerX, event.originalEvent.layerY);
            }
        },

        /**
         * @function dragHandler
         * @param {object} event Event
         * @returns {void}
         */
        dragHandler: function (event) {
            if( me.debug > 1 ) { console.log("> dragHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseDrag(event.originalEvent.layerX, event.originalEvent.layerY, event.delta.x, event.delta.y);
            }
        },

        /**
         * @function dragEndHandler
         * @param {object} event Event
         * @returns {void}
         */
        dragEndHandler: function (event) {
            if( me.debug>1 ) { console.log("> dragEndHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseUp();
            }
        },


        /**
         * @function scrollHandler
         * @param {object} ev Scroll event
         * @returns {void}
         */
        scrollHandler: function (ev) {
            if( me.debug>1 ) { console.log("> scrollHandler") }

            if( me.tools[me.selectedTool]
                && me.tools[me.selectedTool].scrollHandler ) {
                me.tools[me.selectedTool].scrollHandler(ev);
            }
            paper.view.draw();
        },

        /**
         * @function mouseDown
         * @param {number} x X-coordinate for mouse down
         * @param {number} y Y-coordinate for mouse down
         * @returns {void}
         */
        mouseDown: function (x, y) {
            me.debugPrint("> mouseDown", 1);

            me.mouseUndo = me.getUndo();
            var point = paper.view.viewToProject(new paper.Point(x, y));

            me.handle = null;

            if( me.tools[me.selectedTool]
                && me.tools[me.selectedTool].mouseDown ) {
                me.tools[me.selectedTool].mouseDown(point);
            }
            paper.view.draw();
        },

        /**
         * @function mouseDrag
         * @param {number} x X-coordinate where drag event started
         * @param {number} y Y-coordinate where drag event started
         * @param {number} dx Size of the drag step in the X axis
         * @param {number} dy Size of the drag step in the Y axis
         * @returns {void}
         */
        mouseDrag: function (x, y, dx, dy) {
            //if( me.debug ) console.log("> mouseDrag");

            // transform screen coordinate into world coordinate
            var point = paper.view.viewToProject(new paper.Point(x, y));

            // transform screen delta into world delta
            var orig = paper.view.viewToProject(new paper.Point(0, 0));
            var dpoint = paper.view.viewToProject(new paper.Point(dx, dy));
            dpoint.x -= orig.x;
            dpoint.y -= orig.y;
            if( me.handle ) {
                me.handle.x += point.x-me.handle.point.x;
                me.handle.y += point.y-me.handle.point.y;
                me.handle.point = point;
                me.commitMouseUndo();
            } else if (me.tools[me.selectedTool] && me.tools[me.selectedTool].mouseDrag) {
                me.tools[me.selectedTool].mouseDrag(point, dpoint);
            }
            paper.view.draw();
        },

        /**
         * @function mouseUp
         * @returns {void}
         */
        mouseUp: function () {
            if( me.debug ) {
                console.log("> mouseUp");
            }
            if(me.tools[me.selectedTool] && me.tools[me.selectedTool].mouseUp) {
                me.tools[me.selectedTool].mouseUp();
            }
        },

        /**
         * @function simplify
         * @desc Simplify the region path
         * @returns {void}
         */
        simplify: function () {
            if( me.region !== null ) {
                if( me.debug ) { console.log("> simplifying region path"); }

                var origSegments = me.region.path.segments.length;
                me.region.path.simplify();
                var finalSegments = me.region.path.segments.length;
                console.log( parseInt(finalSegments/origSegments*100, 10) + "% segments conserved" );
                paper.view.draw();
            }
        },

        /**
         * @function setRegionColor
         * @desc Set picked color & alpha
         * @returns {void}
         */
        setRegionColor: function () {
            var reg = me.currentColorRegion;
            var hexColor = me.dom.querySelector('#fillColorPicker').value;
            var red = parseInt( hexColor.substring(1, 3), 16 );
            var green = parseInt( hexColor.substring(3, 5), 16 );
            var blue = parseInt( hexColor.substring(5, 7), 16 );

            reg.path.fillColor.red = red / 255;
            reg.path.fillColor.green = green / 255;
            reg.path.fillColor.blue = blue / 255;
            reg.path.fillColor.alpha = me.dom.querySelector('#alphaSlider').value / 100;

            // update region tag
            me.dom
              .querySelector(".region-tag#" + reg.uid + ">.region-color")
              .style['background-color'] ='rgba(' + red + ',' + green + ',' + blue + ',0.67)'

            // update stroke color
            switch( me.dom.querySelector('#selectStrokeColor').selectedIndex ) {
                case 0:
                    reg.path.strokeColor = "black";
                    break;
                case 1:
                    reg.path.strokeColor = "white";
                    break;
                case 2:
                    reg.path.strokeColor = "red";
                    break;
                case 3:
                    reg.path.strokeColor = "green";
                    break;
                case 4:
                    reg.path.strokeColor = "blue";
                    break;
                case 5:
                    reg.path.strokeColor = "yellow";
                    break;
            }
            me.dom.querySelector('#colorSelector').style.display = 'none';
        },

        /**
         * @function onFillColorPicker
         * @desc Update all values on the fly
         * @param {number} value The value assigned to the color picker
         * @returns {void}
         */
        onFillColorPicker: function (value) {
            me.dom.querySelector('#fillColorPicker').value = value;
            var reg = me.currentColorRegion;
            var hexColor = me.dom.querySelector('#fillColorPicker').value;
            var red = parseInt( hexColor.substring(1, 3), 16 );
            var green = parseInt( hexColor.substring(3, 5), 16);
            var blue = parseInt( hexColor.substring(5, 7), 16);
            reg.path.fillColor.red = red / 255;
            reg.path.fillColor.green = green / 255;
            reg.path.fillColor.blue = blue / 255;
            reg.path.fillColor.alpha = me.dom.querySelector('#alphaSlider').value / 100;
            paper.view.draw();
        },

        /**
         * @function onSelectStrokeColor
         * @returns {void}
         */
        onSelectStrokeColor: function () {
            var reg = me.currentColorRegion;
            switch( me.dom.querySelector('#selectStrokeColor').selectedIndex ) {
                case 0:
                    reg.path.strokeColor = "black";
                    break;
                case 1:
                    reg.path.strokeColor = "white";
                    break;
                case 2:
                    reg.path.strokeColor = "red";
                    break;
                case 3:
                    reg.path.strokeColor = "green";
                    break;
                case 4:
                    reg.path.strokeColor = "blue";
                    break;
                case 5:
                    reg.path.strokeColor = "yellow";
                    break;
            }
            paper.view.draw();
        },

        /**
         * @function onAlphaSlider
         * @param {number} value The value assigned to alpha slider
         * @returns {void}
         */
        onAlphaSlider: function (value) {
            me.dom.querySelector('#alphaFill').value = value;
            var reg = me.currentColorRegion;
            reg.path.fillColor.alpha = me.dom.querySelector('#alphaSlider').value / 100;
            paper.view.draw();
        },

        /**
         * @function onAlphaInput
         * @param {number} value The value assigned to alpha input field
         * @returns {void}
         */
        onAlphaInput: function (value) {
            me.dom.querySelector('#alphaSlider').value = value;
            var reg = me.currentColorRegion;
            reg.path.fillColor.alpha = me.dom.querySelector('#alphaSlider').value / 100;
            paper.view.draw();
        },

        /**
         * @function onStrokeWidthDec
         * @returns {void}
         */
        onStrokeWidthDec: function () {
            var reg = me.currentColorRegion;
            reg.path.strokeWidth = Math.max(me.region.path.strokeWidth - 1, 1);
            paper.view.draw();
        },

        /**
         * @function onStrokeWidthInc
         * @returns {void}
         */
        onStrokeWidthInc: function () {
            var reg = me.currentColorRegion;
            reg.path.strokeWidth = Math.min(me.region.path.strokeWidth + 1, 10);
            paper.view.draw();
        },

        /*** UNDO ***/

        /**
         * @function cmdUndo
         * @desc Command to actually perform an undo.
         * @returns {void}
         */
        cmdUndo: function () {
            if( me.UndoStack.length > 0 ) {
                var redoInfo = me.getUndo();
                var undoInfo = me.UndoStack.pop();
                me.applyUndo(undoInfo);
                me.RedoStack.push(redoInfo);
                paper.view.draw();
            }
        },

        /**
         * @function cmdRedo
         * @desc Command to actually perform a redo.
         * @returns {void}
         */
        cmdRedo: function () {
            if( me.RedoStack.length > 0 ) {
                var undoInfo = me.getUndo();
                var redoInfo = me.RedoStack.pop();
                me.applyUndo(redoInfo);
                me.UndoStack.push(undoInfo);
                paper.view.draw();
            }
        },

        /**
         * @function getUndo
         * @desc Return a complete copy of the current state as an undo object.
         * @returns {Object} The undo object
         */
        getUndo: function () {
            var undo = { imageNumber: me.currentImage, regions: [], drawingPolygonFlag: me.drawingPolygonFlag };
            var info = me.ImageInfo[me.currentImage].Regions;
            var i;

            for( i = 0; i < info.length; i += 1 ) {
                var el = {
                    json: JSON.parse(info[i].path.exportJSON()),
                    name: info[i].name,
                    selected: info[i].path.selected,
                    fullySelected: info[i].path.fullySelected
                };
                undo.regions.push(el);
            }

            return undo;
        },

        /**
         * @function saveUndo
         * @desc Save an undo object. This has the side-effect of initializing the redo stack.
         * @param {object} undoInfo The undo info object
         * @returns {void}
         */
        saveUndo: function (undoInfo) {
            me.UndoStack.push(undoInfo);
            me.RedoStack = [];
        },

        /**
         * @function setImage
         * @param {number} imageNumber The image number
         * @returns {void}
         */
        setImage: function (imageNumber) {
            if( me.debug ) { console.log("> setImage"); }
            var index = me.imageOrder.indexOf(imageNumber);

            // update image slider
            me.updateSliderValue(index);

            //update url
            me.updateURL(index);

            me.loadImage(me.imageOrder[index]);
        },

        /**
         * @function applyUndo
         * @desc Restore the current state from an undo object.
         * @param {object} undo The undo object to apply
         * @returns {void}
         */
        applyUndo: function (undo) {
            if( undo.imageNumber !== me.currentImage ) {
                me.setImage(undo.imageNumber);
            }
            var info = me.ImageInfo[undo.imageNumber].Regions;
            var i;
            while( info.length > 0 ) {
                me.removeRegion(info[0], undo.imageNumber);
            }
            me.region = null;
            var reg;
            for( i = 0; i < undo.regions.length; i += 1 ) {
                var el = undo.regions[i];
                var project = paper.projects[me.ImageInfo[undo.imageNumber].projectID];

                /* Create the path and add it to a specific project.
                */

                var path = new paper.Path();
                project.addChild(path);

                /*
                 * @todo This is a workaround for an issue on paper.js. It needs to be removed when the issue will be solved
                 */
                var {insert} = path.insert;
                path.importJSON(el.json);
                path.insert = insert;

                reg = me.newRegion({name:el.name, path:path}, undo.imageNumber);
                // here order matters. if fully selected is set after selected, partially selected paths will be incorrect
                  reg.path.fullySelected = el.fullySelected;
                 reg.path.selected = el.selected;
                if( el.selected ) {
                    if( me.region === null ) {
                        me.region = reg;
                    } else {
                        console.log("Should not happen: two regions selected?");
                    }
                }
            }

            if(undo.callback && typeof undo.callback === 'function') {
                undo.callback();
            }

            /**
             * @todo This line produces an error when the undo object is undefined. However, the code seems to work fine without this line. Check what the line was supposed to do
             */
             // me.drawingPolygonFlag = me.undo.drawingPolygonFlag;
        },

        /**
         * @function commitMouseUndo
         * @desc If we have actually made a change with a mouse operation, commit the undo information.
         * @returns {void}
         */
        commitMouseUndo: function () {
            if( me.mouseUndo !== null ) {
                me.saveUndo(me.mouseUndo);
                me.mouseUndo = null;
            }
        },

        /**
         * @function backToPreviousTool
         * @param {string} prevTool Name of the previously selected tool
         * @returns {void}
         */
        backToPreviousTool: function (prevTool) {
            setTimeout(function() {
                me.selectedTool = prevTool;
                // me.selectTool();
            }, 500);
        },

        /**
         * @function backToSelect
         * @returns {void}
         */
        backToSelect: function () {
            setTimeout(function() {
                me.selectedTool = "select";
                // me.selectTool();
            }, 500);
        },

        /**
         * @function cmdDeleteSelected
         * @desc This function deletes the currently selected object.
         * @returns {void}
         */
        cmdDeleteSelected: function () {
            var undoInfo = me.getUndo();
            var i;
            for( i in me.ImageInfo[me.currentImage].Regions ) {
                if( me.ImageInfo[me.currentImage].Regions[i].path.selected ) {
                    me.removeRegion(me.ImageInfo[me.currentImage].Regions[i]);
                    me.saveUndo(undoInfo);
                    paper.view.draw();
                    break;
                }
            }
        },

        /**
         * @function cmdPaste
         * @returns {void}
         */
        cmdPaste: function () {
            if( me.copyRegion !== null ) {
                var undoInfo = me.getUndo();
                me.saveUndo(undoInfo);
                console.log( "paste " + me.copyRegion.name );
                if( me.findRegionByName(me.copyRegion.name) ) {
                    me.copyRegion.name += " Copy";
                }
                var reg = JSON.parse(JSON.stringify(me.copyRegion));
                reg.path = new paper.Path();

                /**
                 * @todo Workaround for paperjs. remove when the issue will be solver
                 */
                var {insert} = reg.path.insert;
                reg.path.importJSON(me.copyRegion.path);
                reg.path.insert = insert;

                reg.path.fullySelected = true;
                var color = me.regionColor(reg.name);
                reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
                me.newRegion({name:me.copyRegion.name, path:reg.path});
            }
            paper.view.draw();
        },

        /**
         * @function cmdCopy
         * @returns {void}
         */
        cmdCopy: function () {
            if( me.region !== null ) {
                var json = me.region.path.exportJSON();
                me.copyRegion = JSON.parse(JSON.stringify(me.region));
                me.copyRegion.path = json;
                console.log( "< copy " + me.copyRegion.name );
            }
        },

      //  /**
      //    * @function selectTool
      //    * @returns {void}
      //    */
      //   selectTool: function () {
      //     if( me.debug ) { console.log("> selectTool"); }

      //     me.dom.querySelector("img.button1").classList.remove("selected");
      //     me.dom.querySelector("img.button1#" + me.selectedTool).classList.add("selected");
      // },

      clickTool: function (tool) {
          var prevTool = me.selectedTool;

          if( me.tools[prevTool] && me.tools[prevTool].onDeselect ) {
              me.tools[prevTool].onDeselect();
          }

          me.selectedTool = tool;
          // me.selectTool();

          if( me.tools[me.selectedTool] && me.tools[me.selectedTool].click ) {
              me.tools[me.selectedTool].click(prevTool);
          }
        },

        /**
         * @function toolSelection
         * @returns {void}
         */
        toolSelection: function () {
            if( me.debug ) {
                console.log("> toolSelection");
            }
            const tool = this.id;
            me.clickTool(tool);
        },

        /*
         Annotation storage
        */

        /**
         * @function microdrawDBLoad
         * @desc Load SVG overlay from microdrawDB
         * @returns {Promise} A promise to return an array of paths of the current section.
         * @default returns an empty array. Can/should be overwritten in save.js. Users can use their own save.js for different backend.
         */
        microdrawDBLoad: function () {
          return new Promise(function(resolve) {
            if( me.debug ) {
              console.log("> default microdrawDBLoad promise, returning an empty array. Overwrite Microdraw.microdrawDBLoad() to load annotations.");
            }
            resolve([]);
          });
        },

        /**
         * @function save
         * @returns {void}
         */
        save: function () {
            if( me.debug ) { console.log("> save"); }

            var i;
            var obj;
            var el;

            obj = {};
            obj.Regions = [];
            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                el = {};
                el.path = me.ImageInfo[me.currentImage].Regions[i].path.exportJSON();
                el.name = me.ImageInfo[me.currentImage].Regions[i].name;
                obj.Regions.push(el);
            }
            localStorage.Microdraw = JSON.stringify(obj);

            if( me.debug ) {
                console.log("+ saved regions:", me.ImageInfo[me.currentImage].Regions.length);
            }
        },

        /**
         * @function load
         * @returns {void}
         */
        load: function () {
            if( me.debug ) { console.log("> load"); }

            var i, obj, reg;
            if( localStorage.Microdraw ) {
                console.log("Loading data from localStorage");
                obj = JSON.parse(localStorage.Microdraw);
                for( i = 0; i < obj.Regions.length; i += 1 ) {
                    reg = {};
                    var json;
                    reg.name = obj.Regions[i].name;
                    json = obj.Regions[i].path;
                    reg.path = new paper.Path();
                    reg.path.importJSON(json);
                    me.newRegion({name:reg.name, path:reg.path});
                }
                paper.view.draw();
            }
        },


        /***5
            Initialisation
        */

        /**
         * @function loadImage
         * @param {number} imageNumber The image number
         * @returns {void}
         */
        loadImage: function (imageNumber) {
            if( me.debug ) { console.log("> loadImage(" + imageNumber + ")"); }

            // when load a new image, deselect any currently selecting regions
            // n.b. this needs to be called before me.currentImage is set
            me.selectRegion(null);

            // save previous image for some (later) cleanup
            me.prevImage = me.currentImage;

            // set current image to new image
            me.currentImage = imageNumber;

            me.viewer.open(me.ImageInfo[me.currentImage].source);
        },

        /**
         * @function loadNextImage
         * @returns {void}
         */
        loadNextImage: function () {
          if( me.debug ) { console.log("> loadNextImage"); }
          var index = me.imageOrder.indexOf(me.currentImage);
          var nextIndex = (index + 1) % me.imageOrder.length;

          // update image slider
          me.updateSliderValue(nextIndex);

          // update URL
          me.updateURL(nextIndex);

          me.loadImage(me.imageOrder[nextIndex]);
        },

        /**
         * @function loadPreviousImage
         * @returns {void}
         */
        loadPreviousImage: function () {
          console.log("> loadPrevImage");
          var index = me.imageOrder.indexOf(me.currentImage);
          var previousIndex = ((index - 1 >= 0)? index - 1 : me.imageOrder.length - 1 );

          // update image slider
          me.updateSliderValue(previousIndex);

          // update URL
          me.updateURL(previousIndex);

          me.loadImage(me.imageOrder[previousIndex]);
        },


        /**
         * @function resizeAnnotationOverlay
         * @returns {void}
         */
        resizeAnnotationOverlay: function () {
          if( me.debug>1 ) { console.log("> resizeAnnotationOverlay"); }

          var width = me.dom.querySelector("#paperjs-container").offsetWidth;
          var height = me.dom.querySelector("#paperjs-container").offsetHeight;
          me.dom.querySelector("canvas.overlay").offsetWidth = width;
          me.dom.querySelector("canvas.overlay").offsetHeight = height;
          paper.view.viewSize = [
            width,
            height
          ];
          me.transform();
        },

        /**
         * @function initAnnotationOverlay
         * @returns {void}
         */
        initAnnotationOverlay: function () {
            if( me.debug ) { console.log("> initAnnotationOverlay"); }

            // do not start loading a new annotation if a previous one is still being loaded
            if(me.annotationLoadingFlag === true) {
                return;
            }

            //console.log("new overlay size" + me.viewer.world.getItemAt(0).getContentSize());

            /*
               Activate the paper.js project corresponding to this section. If it does not yet
               exist, create a new canvas and associate it to the new project. Hide the previous
               section if it exists.
           */


            // change current section index (for loading and saving)
            me.section = me.currentImage;
            me.fileID = `${me.source}`;

            // hide previous section
            if( me.prevImage && paper.projects[me.ImageInfo[me.prevImage].projectID] ) {
                paper.projects[me.ImageInfo[me.prevImage].projectID].activeLayer.visible = false;
                paper.projects[me.ImageInfo[me.prevImage].projectID].view.element.style.display = "none";
            }

            // if this is the first time a section is accessed, create its canvas, its project,
            // and load its regions from the database
            if( typeof me.ImageInfo[me.currentImage].projectID === "undefined" ) {

                // create canvas
                var canvas = document.createElement("canvas");
                canvas.classList.add("overlay");
                canvas.id =  me.currentImage;
                me.dom.querySelector("#paperjs-container").appendChild(canvas);

                // create project
                paper.setup(canvas);
                me.ImageInfo[me.currentImage].projectID = paper.project.index;

                // load regions from database
                if( me.config.useDatabase ) {
                    me.microdrawDBLoad()
                        .then(function(data) {
                            for( let i = 0; i < data.length; i += 1 ) {
                                const reg = {};
                                reg.name = data[i].annotation.name;
                                const json = data[i].annotation.path;

                                const [type] = json;
                                if (type === 'Path') {
                                    reg.path = new paper.Path();

                                    /** @todo Remove workaround once paperjs will be fixed */
                                    const {insert} = reg.path;
                                    reg.path.importJSON(json);
                                    reg.path.insert = insert;
                                } else if (type === 'CompoundPath') {
                                    reg.path = new paper.CompoundPath();
                                    reg.path.importJSON(json);
                                } else {

                                    /** @todo catch future path types */
                                    reg.path = new paper.Path();

                                    /** @todo Remove workaround once paperjs will be fixed */
                                    const {insert} = reg.path;
                                    reg.path.importJSON(json);
                                    reg.path.insert = insert;
                                }

                                me.newRegion({name:reg.name, path:reg.path});
                            }
                            paper.view.draw();

                            // on db load, do not select any region by default
                            me.selectRegion(null);
                            
                            // if image has no hash, save one
                            me.ImageInfo[me.currentImage].Hash = (data.Hash ? data.Hash : me.hash(JSON.stringify(me.ImageInfo[me.currentImage].Regions)).toString(16));

                            paper.view.draw();

                            if( me.debug ) { console.log("< microdrawDBLoad resolve success. Number of regions:", me.ImageInfo[me.currentImage].Regions.length); }
                        })
                        .catch(function(error) {
                            console.error('< microdrawDBLoad resolve error', error);
                        });
                }

                if( me.debug ) { console.log('Set up new project, currentImage: ' + me.currentImage + ', ID: ' + me.ImageInfo[me.currentImage].projectID); }
            }

            // activate the current section and make it visible
            paper.projects[me.ImageInfo[me.currentImage].projectID].activate();
            paper.project.activeLayer.visible = true;
            paper.project.view.element.style.display = "block";

            // resize the view to the correct size
            var width = me.dom.querySelector("#paperjs-container").offsetWidth;
            var height = me.dom.querySelector("#paperjs-container").offsetHeight;
            paper.view.viewSize = [
                width,
                height
            ];
            paper.settings.handleSize = 10;
            // me.updateRegionList();
            paper.view.draw();

            /**
             * @todo Commenting this line out solves the image size issues set size of the current overlay to match the size of the current image
             */

            //me.magicV = me.viewer.world.getItemAt(0).getContentSize().x / 100;

            me.transform();
        },

        /**
         * @function transform
         * @returns {void}
         */
        transform: function () {
            //if( me.debug ) console.log("> transform");

            var z = me.viewer.viewport.viewportToImageZoom(me.viewer.viewport.getZoom(true));
            var sw = me.viewer.source.width;
            var bounds = me.viewer.viewport.getBounds(true);
            const [x, y, w, h] = [
                me.magicV * bounds.x,
                me.magicV * bounds.y,
                me.magicV * bounds.width,
                me.magicV * bounds.height
            ];
            paper.view.setCenter(x + (w/2), y + (h/2));
            paper.view.zoom = (sw * z) / me.magicV;
        },

        /**
         * @function deparam
         * @returns {Object} Returns an object containing URL parametres
         */
        deparam: function () {
            if( me.debug ) { console.log("> deparam"); }

            /** @todo Use URLSearchParams instead */
            var search = location.search.substring(1);
            var result = search?
                        JSON.parse('{"' + search.replace(/[&]/g, '","').replace(/[=]/g, '":"') + '"}',
                        function(key, value) { return key === "" ? value : decodeURIComponent(value); }) :
                        {};
            if( me.debug ) {
                console.log("url parametres:", result);
            }

            return result;
        },

        /**
         * @function loginChanged
         * @returns {void} Returns a promise that is fulfilled when the user is loged in
         */
        loginChanged: function () {
            if( me.debug ) { console.log("> loginChanged"); }

            // updateUser();

            // remove all annotations and paper projects from old user
            /*
             * @todo Maybe save to db??
             */

            var i;
            paper.projects[me.ImageInfo[me.currentImage].projectID].activeLayer.visible = false;
            paper.projects[me.ImageInfo[me.currentImage].projectID].view.element.style.display = "none";
            for( i = 0; i < me.imageOrder.length; i += 1 ) {

                me.ImageInfo[me.imageOrder[i]].Regions = [];
                if( typeof me.ImageInfo[me.imageOrder[i]].projectID !== "undefined" ) {
                    paper.projects[me.ImageInfo[me.imageOrder[i]].projectID].clear();
                    paper.projects[me.ImageInfo[me.imageOrder[i]].projectID].remove();
                    delete me.ImageInfo[me.imageOrder[i]].projectID;
                }
                me.dom.querySelector(`#${me.currentImage}.overlay`).remove();
            }

            //load new users data

            me.viewer.open(me.ImageInfo[me.currentImage].source);
        },

        /**
         * @function initShortCutHandler
         * @returns {void}
         */
        initShortCutHandler: function () {
          window.addEventListener("keydown", e => {
            if (e.isComposing || e.keyCode === 229) {
                return;
            }
            const key = [];
            if( e.ctrlKey ) { key.push("^"); }
            if( e.altKey ) { key.push("alt"); }
            if( e.shiftKey ) { key.push("shift"); }
            if( e.metaKey ) { key.push("cmd"); }
            key.push(String.fromCharCode(e.keyCode));
            const code = key.join(" ");
            if( me.shortCuts[code] ) {
                const shortcut = me.shortCuts[code];
                shortcut();
                e.stopPropagation();
            }
          });
        },

        /**
         * @function shortCutHandler
         * @param {string} theKey Key used for the shortcut
         * @param {function} callback Function called for the specific key shortcut
         * @returns {void}
         */
        shortCutHandler: function (theKey, callback) {
            var key = me.isMac?theKey.mac:theKey.pc;
            var arr = key.split(" ");
            var i;
            for( i = 0; i < arr.length; i += 1 ) {
                if( arr[i].charAt(0) === "#" ) {
                    arr[i] = String.fromCharCode(parseInt(arr[i].substring(1), 10));
                } else
                if( arr[i].length === 1 ) {
                    arr[i] = arr[i].toUpperCase();
                }
            }
            key = arr.join(" ");
            me.shortCuts[key] = callback;
        },

        /**
         * @function initSlider
         * @desc Initialises a slider to easily change between sections
         * @param {number} minVal Minimum value
         * @param {number} maxVal Maximum value
         * @param {number} step Increase from one slider position to the next
         * @param {number} defaultValue Value at which the slider is initialised
         * @returns {void}
         */
        initSlider: function (minVal, maxVal, step, defaultValue) {
            if( me.debug ) { console.log("> initSlider promise"); }
            var slider = me.dom.querySelector("#slice");
            if( slider ) { // only if slider could be found
                slider.dataset.min = minVal;
                slider.dataset.max = maxVal - 1;
                slider.dataset.step = step;
                slider.dataset.val = defaultValue;

                me.updateSliderDisplay();

                // slider.on("change", function() {
                //     me.sliderOnChange(this.value);
                // });

                // Input event can only be used when not using database, otherwise the annotations will be loaded several times
                /** @todo Fix the issue with the annotations for real */

                // if (me.config.useDatabase === false) {
                //     slider.on("input", function () {
                //         me.sliderOnChange(this.value);
                //     });
                // }
            }
        },

        /**
         * @function sliderOnChange
         * @desc Called when the slider value is changed to load a new section
         * @param {number} newImageNumber Index of the image selected using the slider
         * @returns {void}
         */
        sliderOnChange: function (newImageNumber) {
            if( me.debug ) {
                console.log("> sliderOnChange promise");
            }
            var imageNumber = me.imageOrder[newImageNumber];
            me.loadImage(imageNumber);

            me.updateURL(imageNumber);
        },

        /**
         * @function updateSliderValue
         * @desc Used to update the slider value if the section was changed by another control
         * @param {number} newIndex section number to which the slider will be set
         * @returns {void}
         */
        updateSliderValue: function (newIndex) {
          if( me.debug ) {
            console.log("> updateSliderValue promise");
          }
          var slider = me.dom.querySelector("#slice");
          if( slider ) { // only if slider could be found
            slider.dataset.val = newIndex;
            me.updateSliderDisplay();
          }
        },

        updateSliderDisplay: () => {
          let {val, max} = me.dom.querySelector("#slice").dataset;
          const thumb = me.dom.querySelector("#slice .mui-thumb");
          val = Number(val);
          max = Number(max);
          thumb.style.left = (val*100/max) + "%";
        },

        /**
         * @function findSectionNumber
         * @param {String} numberStr Section number
         * @returns {void}
         */
        findSectionNumber: function (numberStr) {

        /*
            Searches for the given section-number.
            If the number could be found its index will be returned. Otherwise -1
        */
            var number = parseInt(numberStr, 10); // number = NaN if cast to int failed!
            var i;
            if( !isNaN(number) ) {
                for( i = 0; i < me.imageOrder.length; i += 1 ) {
                        var sectionNumber = parseInt(me.imageOrder[i], 10);
                        // Compare the int values because the string values might be different (e.g. "0001" != "1")
                        if( number === sectionNumber ) {
                            return i;
                        }
                }
            }

            return -1;
        },

        /**
         * @function sectionNameOnEnter
         * @param {object} event Event produced by the enter key
         * @returns {void}
         */
        sectionNameOnEnter: function (event) {

        /*
            Eventhandler to open a specific section by the enter key
        */
            if( me.debug ) {
                console.log("> sectionNameOnEnter promise");
            }
            if( event.keyCode === 13 ) { // enter key
                var sectionNumber = this.value;
                var index = me.findSectionNumber(sectionNumber);
                if( index > -1 ) { // if section number exists
                    me.updateSliderValue(index);
                    me.loadImage(me.imageOrder[index]);
                    me.updateURL(index);
                }
            }
            event.stopPropagation(); // prevent the default action (scroll / move caret)
        },

        /**
         * @function updateURL
         * @desc Used to update the URL with the slice value if the section was changed by another control
         * @param {number} newIndex section number to which the URL will be set
         * @returns {void}
         */
        updateURL : function (newIndex) {
            if( me.debug ) {
                console.log('> updateURL');
            }
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('slice', newIndex);
            const newURL = [
                    window.location.protocol,
                    '//',
                    window.location.host,
                    window.location.pathname,
                    '?',
                    urlParams.toString()
            ].join('');
            console.log(newURL);
            const stateObj = {
                oldURL: newURL
            };
            history.pushState(stateObj, "", newURL);
        },

        /**
         * @function addSliceToURL
         * @desc Used to update the URL with the slice value if none is given by user
         * @param {number} newIndex section number to which the URL will be set
         * @returns {void}
         */
        addSliceToURL : function (newIndex) {
            if( me.debug ) {
                console.log('> addSliceToURL');
            }
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('slice', newIndex);
            const newURL = [
                window.location.protocol,
                '//',
                window.location.host,
                window.location.pathname,
                '?',
                urlParams.toString()
            ].join('');
            console.log(newURL);
            const stateObj = {
                oldURL: newURL
            };
            history.pushState(stateObj, "", newURL);
        },

        /**
         * @function loadSourceJson
         * @desc Load source json (from server)
         * @returns {promise} returns a promise, resolving as a microdraw compatible object
         */
        loadSourceJson : function () {
            if( me.debug ) { console.log('> loadSourceJson'); }

            return new Promise((resolve, reject) => {
                const directFetch = new Promise((rs, rj) => {

                    // decide between json (local) and jsonp (cross-origin)
                    var ext = me.params.source.split(".");
                    ext = ext[ext.length - 1];
                    if( ext === "jsonp" ) {
                        if( me.debug ) {
                            console.log("Reading cross-origin jsonp file");
                        }
                        $.ajax({
                            type: 'GET',
                            url: me.params.source + "?callback=?",
                            jsonpCallback: 'f',
                            dataType: 'jsonp',
                            contentType: "application/json",
                            success: function(obj) {
                                rs(obj);
                            },
                            error: function(err) {
                                rj(err);
                            }
                        });
                    } else
                    if( ext === "json" ) {
                        if( me.debug ) {
                            console.log("Reading local json file");
                        }
                        $.ajax({
                            type: 'GET',
                            url: me.params.source,
                            dataType: "json",
                            contentType: "application/json",
                            success: function(obj) {
                                rs(obj);
                            },
                            error: function(err) {
                                rj(err);
                            }
                        });
                    } else {
                        fetch(me.params.source)
                            .then((data) => data.json())
                            .then((json) => {
                                rs(json);
                            })
                            .catch((e) => rj(e));
                    }
                });

                directFetch
                    .then( function (json) {
                            resolve(json);
                    })
                    .catch( (err) => {
                        console.warn('> loadSourceJson : direct fetching of source failed ... ', err, 'attempting to fetch via microdraw server');

                        fetch('/getJson?source='+me.params.source)
                            .then((data) => data.json())
                            .then((json) => {
                                console.log('> loadSourceJson : getjson success', json);
                                resolve(json);
                            })
                            .catch( (err2) => {
                                console.error('> loadSourceJson : fetch json via microdraw failed.', err2);
                                reject(err2);
                            });
                    });
            });
        },

        /**
         * @function loadConfiguration
         * @desc Load general microdraw configuration
         * @returns {Promise<void[]>} returns a promise that resolves when the configuration is loaded
         */
        loadConfiguration: function () {
            return Promise.all([

              // 1st promise in array: always load the default tools
              Promise.all([
                me.loadScript("/lib/jquery-1.11.0.min.js"),
                me.loadScript("/lib/paper-full-0.9.25.min.js"),
                me.loadScript("/lib/openseadragon/openseadragon.js")
              ])
              .then(() => {
                return me.loadScript("/lib/openseadragon-viewerinputhook.min.js");
              })
              .then(() => {
                return Promise.all([
                  me.loadScript("/lib/OpenSeadragonScalebar/openseadragon-scalebar.js"),
                //   me.loadScript("/lib/openseadragon-screenshot/openseadragonScreenshot.min.js"),
                  me.loadScript("https://cdn.jsdelivr.net/gh/r03ert0/Openseadragon-screenshot@v0.0.1/openseadragonScreenshot.js"),
                  me.loadScript("/lib/FileSaver.js/FileSaver.min.js"),
                  me.loadScript("/js/neurolex-ontology.js"),
                  me.loadScript("https://cdn.jsdelivr.net/gh/r03ert0/muijs@v0.1.1/mui.js"),
                  me.loadScript("https://unpkg.com/codeflask/build/codeflask.min.js"),
                  me.loadScript("https://cdn.jsdelivr.net/gh/r03ert0/consolita.js@0.2.1/consolita.js"),
            
                  me.loadScript('/js/tools/home.js'),
                  me.loadScript('/js/tools/navigate.js'),
                  me.loadScript('/js/tools/zoomIn.js'),
                  me.loadScript('/js/tools/zoomOut.js'),
                  me.loadScript('/js/tools/previous.js'),
                  me.loadScript('/js/tools/next.js'),
                  me.loadScript('/js/tools/closeMenu.js'),
                  me.loadScript('/js/tools/openMenu.js')
                ]);
              })
              .then(function () {
                  $.extend(me.tools, ToolHome);
                  $.extend(me.tools, ToolNavigate);
                  $.extend(me.tools, ToolZoomIn);
                  $.extend(me.tools, ToolZoomOut);
                  $.extend(me.tools, ToolPrevious);
                  $.extend(me.tools, ToolNext);
                  $.extend(me.tools, ToolCloseMenu);
                  $.extend(me.tools, ToolOpenMenu);
              }),

              // 2nd promise in array: load configuration file, then load the tools accordingly
              fetch("/js/configuration.json")
                .then((r) => r.json())
                .then((data) => {
                  me.config = data;

                    return Promise.all(
                      // tools loaded dynamically, based on user configuration, server configuration etc.
                      data.presets.default.map( (item) => {

                        /* load script + extend me.tools */
                        return me.loadScript(item.scriptPath)
                          .then( () => {
                            // there maybe multiple exported variables
                            item.exportedVar.forEach( (variable) => {

                              /** @todo use ES 6 for proper module import. eval should be avoided when possible */
                              eval(`$.extend(me.tools,${variable})`);
                            });
                          });
                      })
                    );
                  })
            ]);
        },

        /**
         * @function loadScript
         * @desc Loads script from path if test is not fulfilled
         * @param {string} path Path to script, either a local path or a url
         * @param {function} testScriptPresent Function to test if the script is already present. If undefined, the script will be loaded.
         * @returns {promise} A promise fulfilled when the script is loaded
         */
        loadScript: function (path, testScriptPresent) {
            return new Promise(function (resolve, reject) {
                if(testScriptPresent && testScriptPresent()) {
                    console.log("[loadScript] Script", path, "already present, not loading it again");
                    resolve();
                }
                var s = document.createElement("script");
                s.src = path;
                s.onload=function () {
                    console.log("Loaded", path);
                    resolve();
                };
                s.onerror=function() {
                    console.log("Error", path);
                    reject(new Error("something bad happened"));
                };
                document.body.appendChild(s);
            });
        },

        /**
         * @function changeToolbarDisplay
         * @desc Changes the way in which the toolbar is displayed
         * @param {string} display Position where the toolbar is displayed
         * @returns {void}
         */
        changeToolbarDisplay: function (display) {
          console.log(display);
          switch(display) {
          case "minimize":
            me.dom.querySelector("#tools-maximized").style.display = "none";
            me.dom.querySelector("#tools-minimized").style.display = "block";
            break;
          case "maximize":
            me.dom.querySelector("#tools-maximized").style.display = "block";
            me.dom.querySelector("#tools-minimized").style.display = "none";
            break;
          case "left":
            me.dom.querySelector("body").setAttribute("data-toolbarDisplay", "left");
            break;
          case "right":
            me.dom.querySelector("body").setAttribute("data-toolbarDisplay", "right");
            break;
          }
        },

        /**
         * @function toggleTextInput
         * @param {string} mode One from Chat or Script
         * @returns {void}
         */
        toggleTextInput: function (mode) {
            switch(mode) {
            case "Chat":
            me.dom.querySelector("#textInputBlock").style.display = "block";
            me.dom.getElementById("logScript").classList.add("hidden");
            me.dom.getElementById("logChat").classList.remove("hidden");
            me.dom.querySelector("#logChat #msg").focus();
            break;
            case "Script":
            me.dom.querySelector("#textInputBlock").style.display = "block";
            me.dom.getElementById("logScript").classList.remove("hidden");
            me.dom.getElementById("logChat").classList.add("hidden");
            me.dom.querySelector("#logScript textarea").focus();
            break;
            default:
            me.dom.querySelector("#textInputBlock").style.display = "none";
            }
        },

        /**
         * @function initMicrodraw
         * @returns {void}
         */
        initMicrodraw: async () => {

            if( me.debug ) {
                console.log("> initMicrodraw promise");
            }

            // Enable click on toolbar buttons
            Array.prototype.forEach.call(me.dom.querySelectorAll('#buttonsBlock div.mui.push'), (el) => {
              el.addEventListener('click', me.toolSelection);
            });
            MUI.push(me.dom.querySelector("#sliderBlock #previous"), () => { me.clickTool("previous"); });
            MUI.push(me.dom.querySelector("#sliderBlock #next"), () => { me.clickTool("next"); });
            MUI.slider(me.dom.querySelector("#sliderBlock #slice"), (x) => { me.sliderOnChange(x|0); });
            MUI.chose(me.dom.querySelector("#clickTool.mui-chose"), (title) => {
              console.log(title);
              const el = me.dom.querySelector(`[title="${title}"]`);
              const tool = el.id;
              me.clickTool(tool);
            });

            // set annotation loading flag to false
            me.annotationLoadingFlag = false;

            // Initialize the control key handler and set shortcuts
            me.initShortCutHandler();
            me.shortCutHandler({pc:'^ z', mac:'cmd z'}, me.cmdUndo);
            me.shortCutHandler({pc:'shift ^ z', mac:'shift cmd z'}, me.cmdRedo);
            if( me.config.drawingEnabled ) {
                me.shortCutHandler({pc:'^ x', mac:'cmd x'}, function () {
                    console.log("cut!");
                });
                me.shortCutHandler({pc:'^ v', mac:'cmd v'}, me.cmdPaste);
                me.shortCutHandler({pc:'^ a', mac:'cmd a'}, function () {
                    console.log("select all!");
                });
                me.shortCutHandler({pc:'^ c', mac:'cmd c'}, me.cmdCopy);
                me.shortCutHandler({pc:'#46', mac:'#8'}, me.cmdDeleteSelected); // delete key
            }
            me.shortCutHandler({pc:'#37', mac:'#37'}, me.loadPreviousImage); // left-arrow key
            me.shortCutHandler({pc:'#39', mac:'#39'}, me.loadNextImage); // right-arrow key

            // Configure currently selected tool
            me.selectedTool = "navigate";

            document.body.dataset.toolbardisplay = "left";
            me.dom.querySelector("#tools-minimized").style.display = "none";
            me.dom.querySelector("#tools-minimized").addEventListener("click", () => { me.changeToolbarDisplay("maximize"); });
            MUI.push(me.dom.querySelector(".push#display-minimize"), () => { me.changeToolbarDisplay("minimize"); });
            MUI.push(me.dom.querySelector(".push#display-left"), () => { me.changeToolbarDisplay("left"); });
            MUI.push(me.dom.querySelector(".push#display-right"), () => { me.changeToolbarDisplay("right"); });

            MUI.chose3state(me.dom.querySelector("#text.mui-chose"), me.toggleTextInput);

            Consolita.init(me.dom.querySelector("#logScript"), me.dom);
            
            $(window).resize(function() {
                me.resizeAnnotationOverlay();
            });

            // Load regions label set
            const res = await fetch("/js/10regions.json");
            const labels = await res.json();
            me.ontology = labels;
            me.updateLabelDisplay();
        },

        /**
         * @function initOpenSeadragon
         * @param {Object} obj DZI json configuration object
         * @returns {void}
         */
        initOpenSeadragon: function (obj) {
            if( me.debug ) {
              console.log("json file:", obj);
            }

            // for loading the bigbrain
            if( obj.tileCodeY ) {
              obj.tileSources = obj.tileCodeY;
            }

            // set up the ImageInfo array and me.imageOrder array
            for( let i = 0; i < obj.tileSources.length; i += 1 ) {
              // name is either the index of the tileSource or a named specified in the json file
              const name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
              me.imageOrder.push(name);
              me.ImageInfo[name] = {
                source: obj.tileSources[i],
                Regions: []
              };
              // if getTileUrl is specified, we might need to eval it to get the function
              if( obj.tileSources[i].getTileUrl && typeof obj.tileSources[i].getTileUrl === 'string' ) {
                eval(`me.ImageInfo[name].source.getTileUrl = ${obj.tileSources[i].getTileUrl}`)
              }
            }

            // set default values for new regions (general configuration)
            if (typeof me.config.defaultStrokeColor === "undefined") {
              me.config.defaultStrokeColor = 'black';
            }
            if (typeof me.config.defaultStrokeWidth === "undefined") {
                me.config.defaultStrokeWidth = 1;
            }
            if (typeof me.config.defaultFillAlpha === "undefined") {
                me.config.defaultFillAlpha = 0.5;
            }
            // set default values for new regions (per-brain configuration)
            if (obj.configuration) {
              if (typeof obj.configuration.defaultStrokeColor !== "undefined") {
                me.config.defaultStrokeColor = obj.configuration.defaultStrokeColor;
              }
              if (typeof obj.configuration.defaultStrokeWidth !== "undefined") {
                me.config.defaultStrokeWidth = obj.configuration.defaultStrokeWidth;
              }
              if (typeof obj.configuration.defaultFillAlpha !== "undefined") {
                me.config.defaultFillAlpha = obj.configuration.defaultFillAlpha;
              }
            }

            // init slider that can be used to change between slides
            if(typeof me.params.slice === 'undefined') {
                me.initSlider(0, obj.tileSources.length, 1, Math.round(obj.tileSources.length / 2));
                me.currentImage = me.imageOrder[Math.floor(obj.tileSources.length / 2)];
                me.addSliceToURL(me.currentImage);
            } else {
                me.initSlider(0, obj.tileSources.length, 1, me.params.slice);
                me.currentImage = me.imageOrder[[parseInt(me.params.slice, 10)]];
            }

            me.params.tileSources = obj.tileSources;
            if (typeof obj.fileID !== 'undefined') {
                me.fileID = obj.fileID;
            } else {
                me.fileID = me.source + '_' + me.section;
            }
            me.viewer = new OpenSeadragon({
                // id: "openseadragon1",
                element: me.dom.querySelector("#openseadragon1"),
                prefixUrl: "/lib/openseadragon/images/",
                tileSources: [],
                showReferenceStrip: false,
                referenceStripSizeRatio: 0.2,
                showNavigator: true,
                sequenceMode: false,
                // navigatorId: "myNavigator",
                navigatorPosition: "BOTTOM_RIGHT",
                homeButton:"homee",
                maxZoomPixelRatio:10,
                preserveViewport: true
            });

            // open the currentImage
            me.viewer.open(me.ImageInfo[me.currentImage].source);

            // add the scalebar
            me.viewer.scalebar({
                type: OpenSeadragon.ScalebarType.MICROSCOPE,
                minWidth:'150px',
                pixelsPerMeter:obj.pixelsPerMeter,
                color:'black',
                fontColor:'black',
                backgroundColor:"rgba(255, 255, 255, 0.5)",
                barThickness:4,
                location: OpenSeadragon.ScalebarLocation.TOP_RIGHT,
                xOffset:5,
                yOffset:5
            });

            /* fixes https://github.com/r03ert0/microdraw/issues/142  */
            me.viewer.scalebarInstance.divElt.style.pointerEvents = `none`;

            // add screenshot
            me.viewer.screenshot({
                showOptions: false, // Default is false
                // keyboardShortcut: 'p', // Default is null
                // showScreenshotControl: true // Default is true
            });

            // add handlers: update section name, animation, page change, mouse actions
            me.viewer.addHandler('open', function () {
                me.initAnnotationOverlay();
            });
            me.viewer.addHandler('animation', function () {
                me.transform();
            });
            me.viewer.addHandler("page", function (data) {
                console.log(data.page, me.params.tileSources[data.page]);
            });
            me.viewer.addViewerInputHook({hooks: [
                {tracker: 'viewer', handler: 'clickHandler', hookHandler: me.clickHandler},
                {tracker: 'viewer', handler: 'pressHandler', hookHandler: me.pressHandler},
                {tracker: 'viewer', handler: 'dragHandler', hookHandler: me.dragHandler},
                {tracker: 'viewer', handler: 'dragEndHandler', hookHandler: me.dragEndHandler},
                {tracker: 'viewer', handler: 'scrollHandler', hookHandler: me.scrollHandler}
            ]});

            if( me.debug ) {
                console.log("< initOpenSeadragon resolve: success");
            }
        },

        /**
         * @function toggleMenu
         * @return {void}
         */
        toggleMenu: function () {
            if( me.dom.querySelector('#menuBar').style.display === 'none' ) {
                me.dom.querySelector('#menuBar').style.display = 'block';
                me.dom.querySelector('#menuButton').style.display = 'none';
            } else {
                me.dom.querySelector('#menuBar').style.display = 'none';
                me.dom.querySelector('#menuButton').style.display = 'block';
            }
        },

        init: function (dom) {
          me.dom = dom;
          me.loadConfiguration()
            .then(function () {
              if( me.config.useDatabase ) {
                Promise.all([]) // [microdrawDBIP(), MyLoginWidget.init()]
                  .then(function () {
                    me.params = me.deparam();
                    me.section = me.currentImage;
                    me.source = me.params.source;
                    if(typeof me.params.project !== 'undefined') {
                        me.project = me.params.project;
                    }
                    // updateUser();
                  })
                  .then(me.initMicrodraw);
              } else {
                me.params = me.deparam();
                me.initMicrodraw();
              }
            })
            .then( () => me.loadSourceJson())
            .then( (json) => me.initOpenSeadragon(json));
        }
    };
    
    return me;
}());

/*
    // Log microdraw
    //microdrawDBSave(JSON.stringify(myOrigin), "entered", null);

    // load SVG overlay from localStorage
    microdrawDBLoad();
    //load();
*/
//})();
