/*eslint-env jquery*/
/*global paper*/
/*global OpenSeadragon*/
/*global localhost*/
/*global Ontology*/

var Microdraw = (function () {
    var me = {
        debug: 1,
        dbroot: localhost + "/api",
        ImageInfo: {},              // regions, and projectID (for the paper.js canvas) for each slices, can be accessed by the slice name. (e.g. me.ImageInfo[me.imageOrder[viewer.currentPage()]])
                                    // regions contain a paper.js path, a unique ID and a name
        imageOrder: [],             // names of slices ordered by their openseadragon page numbers
        currentImage: null,         // name of the current image
        prevImage: null,            // name of the last image
        region: null,               // currently selected region (one element of Regions[])
        copyRegion: null,           // clone of the currently selected region for copy/paste
        handle: null,               // currently selected control point or handle (if any)
        selectedTool: null,         // currently selected tool
        viewer: null,               // open seadragon viewer
        navEnabled: true,           // flag indicating whether the navigator is enabled (if it's not, the annotation tools are)
        magicV: 1000,               // resolution of the annotation canvas - is changed automatically to reflect the size of the tileSource
        params: null,               // URL parameters
        source: null,               // data source
        slice: null,                // slice index in a multi-slice dataset
        //    myIP,                 // user's IP
        UndoStack: [],
        RedoStack: [],
        mouseUndo: null,            // tentative undo information.
        shortCuts: [],              // List of shortcuts
        newRegionFlag: null,        // true when a region is being drawn
        drawingPolygonFlag: false,  // true when drawing a polygon
        annotationLoadingFlag: null,// true when an annotation is being loaded
        config: {},                 // App configuration object
        isMac: navigator.platform.match(/Mac/i),
        isIOS: navigator.platform.match(/(iPhone|iPod|iPad)/i),
        tolerance: 10,
        counter: 1,
        tap: false,
        currentColorRegion: null,

        /*
            Region handling functions
        */

        /**
         * @function regionUID
         * @returns {number} counter Number of regions in the current slice.
         */
        regionUID: function regionUID() {
            if( me.debug ) {
                console.log("> regionUID");
            }

            var i;
            var found = false;
            while( found === false ) {
                found = true;
                for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                    if( parseInt(me.ImageInfo[me.currentImage].Regions[i].uid, 10) === me.counter ) {
                        me.counter += 1;
                        found = false;
                        break;
                    }
                }
            }

            return me.counter;
        },

        /**
         * @function hash
         * @param {string} str
         */
        hash: function hash(str) {
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
        regionHashColor: function regionHashColor(name) {
            //if(me.debug) console.log("> regionHashColor");

            var color = {};
            var h = me.hash(name);

            // add some randomness
            h = Math.sin(h += 1)*10000;
            h = 0xffffff*(h-Math.floor(h));

            color.red = h & 0xff;
            color.green = (h & 0xff00)>>8;
            color.blue = (h & 0xff0000)>>16;

            return color;
        },

        /**
         * @function findRegionByUID
         * @ param {number} uid Unique ID of a regiron.
         */
        findRegionByUID: function findRegionByUID(uid) {
            if( me.debug ) {
                console.log("> findRegionByUID");
            }

            var i;
            if( me.debug > 2 ) {
                console.log( "look for uid: " + uid);
            }
            // if( me.debug > 2 ) console.log( me.ImageInfo );
            if( me.debug > 2 ) {
                console.log( "region array lenght: " + me.ImageInfo[me.currentImage].Regions.length );
            }

            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                if( parseInt(me.ImageInfo[me.currentImage].Regions[i].uid, 10) === parseInt(uid) ) {
                    if( me.debug > 2 ) { console.log( "region " + me.ImageInfo[me.currentImage].Regions[i].uid + ": " ); }
                    if( me.debug > 2 ) { console.log( me.ImageInfo[me.currentImage].Regions[i] ); }

                    return me.ImageInfo[me.currentImage].Regions[i];
                }
            }
            console.log("Region with unique ID " + uid + " not found");

            return;
        },

        /**
         * @function regionTag
         * @param {string} name Name of the region.
         * @param {number} uid Unique ID of the region.
         */
        regionTag: function regionTag(name, uid) {
            //if( me.debug ) console.log("> regionTag");

            var str;
            var color = me.regionHashColor(name);
            if( uid ) {
                var reg = me.findRegionByUID(uid);
                var mult = 1.0;
                if( reg ) {
                    mult = 255;
                    color = reg.path.fillColor;
                } else {
                    color = me.regionHashColor(name);
                }
                str = [
                        "<div class='region-tag' id='" + uid + "' style='padding:2px'>",
                        "<img class='eye' title='Region visible' id='eye_" + uid + "' src='img/eyeOpened.svg' />",
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
                color = me.regionHashColor(name);
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
         * @param {object} reg The region to select.
         * @this
         */
        selectRegion: function selectRegion(reg) {
            if( me.debug ) { console.log("> selectRegion"); }

            var i;

            // Select path
            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                if( me.ImageInfo[me.currentImage].Regions[i] === reg ) {
                    reg.path.selected = true;
                    reg.path.fullySelected = true;
                    region = reg;
                } else {
                    me.ImageInfo[me.currentImage].Regions[i].path.selected = false;
                    me.ImageInfo[me.currentImage].Regions[i].path.fullySelected = false;
                }
            }
            paper.view.draw();

            // Select region name in list
            $("#regionList > .region-tag").each(function () {
                $(this).addClass("deselected");
                $(this).removeClass("selected");
            });

            var tag = $("#regionList > .region-tag#" + reg.uid);
            $(tag).removeClass("deselected");
            $(tag).addClass("selected");

            if(me.debug) { console.log("< selectRegion"); }
        },

        /**
         * @function changeRegionName
         *@param {object} reg The entry in the region's array.
         *@param {string} name Name of the region.
         */
        changeRegionName: function changeRegionName(reg, name) {
            if( me.debug ) { console.log("> changeRegionName"); }

            var color = me.regionHashColor(name);

            // Update path
            reg.name = name;
            reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
            paper.view.draw();

            // Update region tag
            $(".region-tag#" + reg.uid + ">.region-name").text(name);
            $(".region-tag#" + reg.uid + ">.region-color").css('background-color', 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.67)');
        },

        /**
         * @function toggleRegion
         * @desc Toggle the visibility of a region
         */
        toggleRegion: function toggleRegion(reg) {
            if( me.region !== null ) {
                if( me.debug ) { console.log("> toggle region"); }

                var color = me.regionHashColor(reg.name);
                if( reg.path.fillColor !== null ) {
                    reg.path.storeColor = reg.path.fillColor;
                    reg.path.fillColor = null;

                    reg.path.strokeWidth = 0;
                    reg.path.fullySelected = false;
                    reg.storeName = reg.name;
                    //reg.name=reg.name + '*';
                    $('#eye_' + reg.uid).attr('src', 'img/eyeClosed.svg');
                } else {
                    reg.path.fillColor = reg.path.storeColor;
                    reg.path.strokeWidth = 1;
                    reg.name = reg.storeName;
                    $('#eye_' + reg.uid).attr('src', 'img/eyeOpened.svg');
                }
                paper.view.draw();
                $(".region-tag#" + reg.uid + ">.region-name").text(reg.name);
            }
        },


        /**
         * @function pad
         * @desc Add leading zeros
         */
        pad: function pad(number, length) {
            var str = String(number);
            while( str.length < length ) { str = '0' + str; }

            return str;
        },

        /**
         * @function annotationStyle
         * @desc Get current alpha & color values for colorPicker display
         */
        annotationStyle: function annotationStyle(reg) {
            if( me.debug ) { console.log(reg.path.fillColor); }

            if( me.region !== null ) {
                if( me.debug ) { console.log("> changing annotation style"); }

                me.currentColorRegion = reg;
                var {alpha} = reg.path.fillColor.alpha;
                $('#alphaSlider').val(alpha*100);
                $('#alphaFill').val(parseInt(alpha*100), 10);

                var hexColor = '#'
                    + me.pad(( parseInt(reg.path.fillColor.red * 255, 10) ).toString(16), 2)
                    + me.pad(( parseInt(reg.path.fillColor.green * 255, 10) ).toString(16), 2)
                    + me.pad(( parseInt(reg.path.fillColor.blue * 255, 10) ).toString(16), 2);
                if( me.debug ) {
                    console.log(hexColor);
                }

                $('#fillColorPicker').val( hexColor );

                if( $('#colorSelector').css('display') === 'none' ) {
                    $('#colorSelector').css('display', 'block');
                } else {
                    $('#colorSelector').css('display', 'none');
                }
            }
        },

        /**
         * @function regionPicker
         */
        regionPicker: function regionPicker(parent) {
            if( me.debug ) { console.log("> regionPicker"); }

            $("div#regionPicker").appendTo("body");
            $("div#regionPicker").show();
        },

        /**
         * @function singlePressOnRegion
         * @this
         */
        singlePressOnRegion: function singlePressOnRegion(event) {
            if( me.debug ) {
                console.log("> singlePressOnRegion");
            }

            event.stopPropagation();
            event.preventDefault();

            var el = $(this);
            var reg;
            var uid;

            if( me.debug ) {
                console.log(event);
            }
            if( event.clientX > 20 ) {
                if( event.clientX > 50 ) {

                    if( el.hasClass("ontology") ) {
                        // Click on regionPicker (ontology selection list)
                        var newName = el.find(".region-name").text();
                        uid = $(".region-tag.selected").attr('id');
                        reg = me.findRegionByUID(uid);
                        if( reg ) {
                            me.changeRegionName(reg, newName);
                            $("div#regionPicker").appendTo($("body")).hide();
                        }
                    } else {
                        // Click on regionList (list or annotated regions)
                        uid = $(this).attr('id');
                        reg = me.findRegionByUID(uid);
                        if( reg ) {
                            me.selectRegion(reg);
                        } else { console.log("region undefined"); }
                    }
                } else {
                    reg = me.findRegionByUID(this.id);
                    if( reg ) {
                        if( reg.path.fillColor !== null ) {
                            me.selectRegion(reg);
                        }
                        me.annotationStyle(reg);
                    }
                }
            } else {
                reg = me.findRegionByUID(this.id);
                if( reg ) {
                    me.toggleRegion(reg);
                }
            }
        },

        /**
         * @function doublePressOnRegion
         * @this
         */
        doublePressOnRegion: function doublePressOnRegion(event) {
            if( me.debug ) {
                console.log("> doublePressOnRegion");
            }

            var reg;
            var name;

            event.stopPropagation();
            event.preventDefault();

            if( event.clientX > 20 ) {
                if( event.clientX > 50 )    {
                    if( me.config.drawingEnabled ) {
                        if( me.config.regionOntology === true ) {
                            me.regionPicker(this);
                        } else {
                            name = prompt("Region name", me.findRegionByUID(this.id).name);
                            if( name !== null ) {
                                me.changeRegionName(findRegionByUID(this.id), name);
                            }
                        }
                    }
                } else {
                    reg = me.findRegionByUID(this.id);
                    if( reg ) {
                        if( reg.path.fillColor !== null ) {
                            me.selectRegion(reg);
                        }
                        me.annotationStyle(reg);
                    }
                }
            } else {
                reg = me.findRegionByUID(this.id);
                me.toggleRegion(reg);
            }
        },

        /**
         * @function handleRegionTap
         * @this
         */
        handleRegionTap: function handleRegionTap(event) {

        /*
            Handles single and double tap in touch devices
        */
            if( me.debug ) { console.log("> handleRegionTap"); }

            var caller = this;

            if( !me.tap ) { //if tap is not set, set up single tap
                me.tap = setTimeout(function() {
                    me.tap = null;
                }, 300);

                // call singlePressOnRegion(event) using 'this' as context
                me.singlePressOnRegion.call(this, event);
            } else {
                clearTimeout(me.tap);
                me.tap = null;

                // call doublePressOnRegion(event) using 'this' as context
                me.doublePressOnRegion.call(this, event);
            }
            if( me.debug ) { console.log("< handleRegionTap"); }
        },


        /**
         * @function newRegion
         * @desc  Create a new region
         * @param {object} arg An object containing the name of the region (arg.name) and the path data (arg.path)
         * @param {number} imageNumber The number of the image where the region will be created
         * @this
         */
        newRegion: function newRegion(arg, imageNumber) {
            if( me.debug ) {
                console.log("> newRegion");
            }
            var reg = {};

            reg.uid = me.regionUID();
            if( arg.name ) {
                reg.name = arg.name;
            } else {
                reg.name = "Untitled " + reg.uid;
            }

            var color = me.regionHashColor(reg.name);

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
            if( imageNumber === me.currentImage ) {
                // append region tag to regionList
                var el = $(me.regionTag(reg.name, reg.uid));
                $("#regionList").append(el);

                // handle single click on computers
                el.click(me.singlePressOnRegion);

                // handle double click on computers
                el.dblclick(me.doublePressOnRegion);

                // handle single and double tap on touch devices
                /**
                 * @todo it seems that a click event is also fired on touch devices, making this one redundant
                 */

                el.on("touchstart", me.handleRegionTap);
            }

            // Select region name in list
            $("#regionList > .region-tag").each(function (i) {
                $(this).addClass("deselected");
                $(this).removeClass("selected");
            });

            var tag = $("#regionList > .region-tag#" + reg.uid);
            $(tag).removeClass("deselected");
            $(tag).addClass("selected");

            // push the new region to the Regions array
            me.ImageInfo[imageNumber].Regions.push(reg);

            return reg;
        },

        /**
         * @function removeRegion
         * @desc Remove region from current image
         * @param {object} reg The region is going to be removed by this function
         * @param {number} imageNumber The number of the image where the region will be removed
         */
        removeRegion: function removeRegion(reg, imageNumber) {
            if( me.debug ) { console.log("> removeRegion"); }

            if( typeof imageNumber === "undefined" ) {
                imageNumber = me.currentImage;
            }

            // remove from Regions array
            me.ImageInfo[imageNumber].Regions.splice(me.ImageInfo[imageNumber].Regions.indexOf(reg), 1);
            // remove from paths
            reg.path.remove();
            if( imageNumber === me.currentImage ) {
                // remove from regionList
                var tag = $("#regionList > .region-tag#" + reg.uid);
                $(tag).remove();
            }
        },

        /**
         * @function findRegionByName
         */
        findRegionByName: function findRegionByName(name) {
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
         */
        appendRegionTagsFromOntology: function appendRegionTagsFromOntology(o) {
            if( me.debug ) { console.log("> appendRegionTagsFromOntology"); }

            var i;
            for( i = 0; i < o.length; i += 1 ) {
                if( o[i].parts ) {
                    $("#regionPicker").append("<div>" + o[i].name + "</div>");
                    me.appendRegionTagsFromOntology(o[i].parts);
                } else {
                    var tag = me.regionTag(o[i].name);
                    var el = $(tag).addClass("ontology");
                    $("#regionPicker").append(el);

                    // handle single click on computers
                    el.click(me.singlePressOnRegion);

                    // handle double click on computers
                    el.dblclick(me.doublePressOnRegion);

                    el.on("touchstart", me.handleRegionTap);
                }
            }
        },

        /**
         * @function updateRegionList
         * @this
         * @returns {void}
         */
        updateRegionList: function updateRegionList() {
            if( me.debug ) { console.log("> updateRegionList"); }

            var i;
            
            // remove all entries in the regionList
            $("#regionList > .region-tag").each(function() {
                $(this).remove();
            });

            // adding entries corresponding to the me.currentImage
            for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                var reg = me.ImageInfo[me.currentImage].Regions[i];
                // append region tag to regionList
                var el = $(me.regionTag(reg.name, reg.uid));
                $("#regionList").append(el);

                // handle single click on computers
                el.click(me.singlePressOnRegion);
                // handle double click on computers
                el.dblclick(me.doublePressOnRegion);
                // handle single and double tap on touch devices
                el.on("touchstart", me.handleRegionTap);
            }
        },

        /**
         * @function checkRegionSize
         * @param {object} reg The selected region
         * @returns {void}
         */
        checkRegionSize: function checkRegionSize(reg) {
            if( reg.path.segments.length > 3 ) {

            } else {
                me.removeRegion(me.region, me.currentImage);
            }
        },

        /**
         * @function clickHandler
         * @desc Interaction: mouse and tap
         * @returns {void}
         */
        clickHandler: function clickHandler(event) {
            if( me.debug ) { console.log("> clickHandler"); }

            event.stopHandlers = !me.navEnabled;
            if( me.selectedTool == "draw" ) {
                me.checkRegionSize(me.region);
            }
        },

        /**
         * @function pressHandler
         * @returns {void}
         */
        pressHandler: function pressHandler(event) {
            if( me.debug ) { console.log("> pressHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseDown(event.originalEvent.layerX, event.originalEvent.layerY);
            }
        },

        /**
         * @function dragHandler
         * @returns {void}
         */
        dragHandler: function dragHandler(event) {
            if( me.debug > 1 ) { console.log("> dragHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseDrag(event.originalEvent.layerX, event.originalEvent.layerY, event.delta.x, event.delta.y);
            }
        },

        /**
         * @function dragEndHandler
         * @returns {void}
         */
        dragEndHandler: function dragEndHandler(event) {
            if( me.debug ) { console.log("> dragEndHandler"); }

            if( !me.navEnabled ) {
                event.stopHandlers = true;
                me.mouseUp();
            }
        },

        /**
         * @function mouseDown
         * @returns {void}
         */
        mouseDown: function mouseDown(x, y) {
            if( me.debug > 1 ) { console.log("> mouseDown"); }

            me.mouseUndo = me.getUndo();
            var prevRegion = null;
            var point = paper.view.viewToProject(new paper.Point(x, y));
            var hitResult;

            me.handle = null;

            switch( me.selectedTool ) {
                case "select":
                case "addpoint":
                case "delpoint":
                case "addregion":
                case "delregion":
                case "splitregion": {
                    hitResult = paper.project.hitTest(point, {
                            tolerance: me.tolerance,
                            stroke: true,
                            segments: true,
                            fill: true,
                            handles: true
                        });

                    me.newRegionFlag = false;
                    if( hitResult ) {
                        var i, re;
                        for( i = 0; i < me.ImageInfo[me.currentImage].Regions.length; i += 1 ) {
                            if( me.ImageInfo[me.currentImage].Regions[i].path == hitResult.item ) {
                                re = me.ImageInfo[me.currentImage].Regions[i];
                                break;
                            }
                        }

                        // select path
                        if( me.region && me.region != re ) {
                            me.region.path.selected = false;
                            prevRegion = me.region;
                        }
                        me.selectRegion(re);

                        if( hitResult.type == 'handle-in' ) {
                            me.handle = hitResult.segment.handleIn;
                            me.handle.point = point;
                        } else if( hitResult.type == 'handle-out' ) {
                            me.handle = hitResult.segment.handleOut;
                            me.handle.point = point;
                        } else if( hitResult.type == 'segment' ) {
                            if( me.selectedTool == "select" ) {
                                me.handle = hitResult.segment.point;
                                me.handle.point = point;
                            }
                            if( me.selectedTool == "delpoint" ) {
                                hitResult.segment.remove();
                                me.commitMouseUndo();
                            }
                        } else if( hitResult.type == 'stroke' && me.selectedTool == "addpoint" ) {
                            me.region.path
                            .curves[hitResult.location.index]
                            .divide(hitResult.location);
                            me.region.path.fullySelected = true;
                            me.commitMouseUndo();
                            paper.view.draw();
                        } else if( me.selectedTool == "addregion" ) {
                            if( prevRegion ) {
                                var newPath = me.region.path.unite(prevRegion.path);
                                me.removeRegion(prevRegion);
                                me.region.path.remove();
                                me.region.path = newPath;
                                me.updateRegionList();
                                me.selectRegion(me.region);
                                paper.view.draw();
                                me.commitMouseUndo();
                                me.backToSelect();
                            }
                        } else if( me.selectedTool == "delregion" ) {
                            if( prevRegion ) {
                                var newPath = prevRegion.path.subtract(me.region.path);
                                me.removeRegion(prevRegion);
                                prevRegion.path.remove();
                                me.newRegion({path:newPath});
                                me.updateRegionList();
                                me.selectRegion(me.region);
                                paper.view.draw();
                                me.commitMouseUndo();
                                me.backToSelect();
                            }
                        } else if( me.selectedTool == "splitregion" ) {

                            /*selected region is prevRegion!
                            region is the region that should be split based on prevRegion
                            newRegionPath is outlining that part of region which has not been overlaid by prevRegion
                            i.e. newRegion is what was region
                            and prevRegion color should go to the other part*/
                            if( prevRegion ) {
                                var prevColor = prevRegion.path.fillColor;
                                //color of the overlaid part
                                var color = me.region.path.fillColor;
                                var newPath = me.region.path.divide(prevRegion.path);

                                me.removeRegion(prevRegion);
                                me.region.path.remove();

                                me.region.path = newPath;
                                var newReg;
                                for( i = 0; i < newPath._children.length; i += 1 ) {
                                    if( i == 0 ) {
                                        me.region.path = newPath._children[i];
                                    } else {
                                        newReg = newRegion({path:newPath._children[i]});
                                    }
                                }
                                me.region.path.fillColor = color;
                                if( newReg ) {
                                    newReg.path.fillColor = prevColor;
                                }
                                me.updateRegionList();
                                me.selectRegion(me.region);
                                paper.view.draw();

                                me.commitMouseUndo();
                                me.backToSelect();
                            }
                        }
                        break;
                    }
                    if( hitResult == null && me.region ) {
                        //deselect paths
                        me.region.path.selected = false;
                        me.region = null;
                    }
                    break;
                }
                case "draw": {
                    // Start a new region
                    // if there was an older region selected, unselect it
                    if( me.region ) {
                        me.region.path.selected = false;
                    }
                    // start a new region
                    var path = new paper.Path({segments:[point]});
                    path.strokeWidth = me.config.defaultStrokeWidth;
                    me.region = me.newRegion({path:path});
                    // signal that a new region has been created for drawing
                    me.newRegionFlag = true;

                    me.commitMouseUndo();
                    break;
                }
                case "draw-polygon": {
                    // is already drawing a polygon or not?
                    if( me.drawingPolygonFlag == false ) {
                        // deselect previously selected region
                        if( me.region ) { me.region.path.selected = false; }

                        // Start a new Region with alpha 0
                        var path = new paper.Path({segments:[point]});
                        path.strokeWidth = me.config.defaultStrokeWidth;
                        me.region = me.newRegion({path:path});
                        me.region.path.fillColor.alpha = 0;
                        me.region.path.selected = true;
                        me.drawingPolygonFlag = true;
                        me.commitMouseUndo();
                    } else {
                        hitResult = paper.project.hitTest(point, {tolerance:me.tolerance, segments:true});
                        if( hitResult && hitResult.item === me.region.path && hitResult.segment.point === me.region.path.segments[0].point ) {
                            // clicked on first point of current path
                            // --> close path and remove drawing flag
                            me.finishDrawingPolygon(true);
                        } else {
                            // add point to region
                            me.region.path.add(point);
                            me.commitMouseUndo();
                        }
                    }
                    break;
                }
                case "rotate":
                    me.region.origin = point;
                    break;
            }
            paper.view.draw();
        },

        /**
         * @function mouseDrag
         * @returns {void}
         */
        mouseDrag: function mouseDrag(x, y, dx, dy) {
            //if( me.debug ) console.log("> mouseDrag");

            // transform screen coordinate into world coordinate
            var point = paper.view.viewToProject(new paper.Point(x, y));
            var i;

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
            } else if( me.selectedTool === "draw" ) {
                me.region.path.add(point);
            } else if( me.selectedTool === "select" ) {
                // event.stopHandlers = true;
                for( i in me.ImageInfo[me.currentImage].Regions ) {
                    var reg = me.ImageInfo[me.currentImage].Regions[i];
                    if( reg.path.selected ) {
                        reg.path.position.x += dpoint.x;
                        reg.path.position.y += dpoint.y;
                        me.commitMouseUndo();
                    }
                }
            }
            if( me.selectedTool === "rotate" ) {
                event.stopHandlers = true;
                var degree = parseInt(dpoint.x, 10);
                for( i in me.ImageInfo[me.currentImage].Regions ) {
                    if( me.ImageInfo[me.currentImage].Regions[i].path.selected ) {
                        me.ImageInfo[me.currentImage].Regions[i].path.rotate(degree, me.region.origin);
                        me.commitMouseUndo();
                    }
                }
            }
            paper.view.draw();
        },

        /**
         * @function mouseUp
         * @returns {void}
         */
        mouseUp: function mouseUp() {
            if( me.debug ) {
                console.log("> mouseUp");
            }

            if( me.newRegionFlag === true ) {
                me.region.path.closed = true;
                me.region.path.fullySelected = true;
                // to delete all unnecessary segments while preserving the form of the
                // region to make it modifiable; & adding handles to the segments
                var origSegments = me.region.path.segments.length;

                // delete unnecessary segments while preserving the shape of the region to
                // make it modifiable and & adding handles to the segments
                if (me.debug) {
                    origSegments = me.region.path.segments.length;
                }
                // pixels per dot (dot is a device-independent psuedo-pixel with a
                // resolution of roughly 72 dpi)
                var ppd = paper.view.pixelRatio;
         
                // mouse selection accuracy in pixels: about 4 dots, that is 4 ppd pixels
                var pixelSelectAccuracy = 4.0*ppd;
         
                // ratio between project coordinates and browser pixels
                var coordsPerPixel = paper.view.size.width/paper.view.viewSize.width;

                // accuracy by which curves can reasonably be simplified
                var simplifyAccuracy = coordsPerPixel*pixelSelectAccuracy;

                // the simplify function looks at the maximum squared distance from curve to original points
                me.region.path.simplify(simplifyAccuracy*simplifyAccuracy);

                /*
                  // previous monkey-patched code 
                  var z = viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
                  var x = z * 30;
                  var previousPosition = region.path.position;
                  region.path.scale(x, x)
                  region.path.simplify(0);    }
                  region.path.scale(1/x, 1/x)
                  region.path.position = previousPosition;
                */ 

                if (me.debug) {
                    var finalSegments = me.region.path.segments.length;
                    console.log( finalSegments, parseInt(finalSegments/origSegments*100, 10) + "% segments conserved" );
                }
            }
            paper.view.draw();
        },

        /**
         * @function simplify
         * @desc Simplify the region path
         * @returns {void}
         */
        simplify: function simplify() {
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
         * @function flipRegion
         * @desc Flip region along y-axis around its center point
         * @returns {void}
         */
        flipRegion: function flipRegion() {
            if( me.region !== null ) {
                if( me.debug ) { console.log("> flipping region"); }

                var i;
                for( i in me.ImageInfo[me.currentImage].Regions ) {
                    if( me.ImageInfo[me.currentImage].Regions[i].path.selected ) {
                        me.ImageInfo[me.currentImage].Regions[i].path.scale(-1, 1);
                    }
                }
                paper.view.draw();
            }
        },

        /**
         * @function bezierToPolygon
         * @desc converts bezier curve into polygon
         * @returns {void}
         */

        bezierToPolygon: function bezierToPolygon() {
            console.log("> bezierToPolygon");
            if (me.region !== null) {
                if (me.region.path.hasHandles()) {
                    if (confirm('Convert bezier curve into polygon?')) {
                        var undoInfo = me.getUndo();
                        me.region.path.clearHandles();
                        me.saveUndo(undoInfo);
                    }
                } else {
                    return;
                }
                paper.view.draw();
            }
        },

        /**
         * @function polygonToBezier
         * @desc converts polygon into bezier curve
         * @returns {void}
         */
        polygonToBezier: function polygonToBezier() {
            console.log("> polygonToBezier");
            if (me.region !== null) {
                if (me.region.path.hasHandles()) {
                    return;
                }
                var undoInfo = me.getUndo();
                me.region.path.smooth();
                me.saveUndo(undoInfo);
                paper.view.draw();
            }
        },

        /**
         * @function setRegionColor
         * @desc Set picked color & alpha
         * @returns {void}
         */
        setRegionColor: function setRegionColor() {
            var reg = me.currentColorRegion;
            var hexColor = $('#fillColorPicker').val();
            var red = parseInt( hexColor.substring(1, 3), 16 );
            var green = parseInt( hexColor.substring(3, 5), 16 );
            var blue = parseInt( hexColor.substring(5, 7), 16 );

            reg.path.fillColor.red = red / 255;
            reg.path.fillColor.green = green / 255;
            reg.path.fillColor.blue = blue / 255;
            reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;

            // update region tag
            $(".region-tag#" + reg.uid + ">.region-color").css(
                'background-color',
                'rgba(' + red + ',' + green + ',' + blue + ',0.67)'
            );

            // update stroke color
            switch( $('#selectStrokeColor')[0].selectedIndex ) {
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
            $('#colorSelector').css('display', 'none');
        },

        /**
         * @function onFillColorPicker
         * @desc Update all values on the fly
         * @returns {void}
         */
        onFillColorPicker: function onFillColorPicker(value) {
            $('#fillColorPicker').val(value);
            var reg = me.currentColorRegion;
            var hexColor = $('#fillColorPicker').val();
            var red = parseInt( hexColor.substring(1, 3), 16 );
            var green = parseInt( hexColor.substring(3, 5), 16);
            var blue = parseInt( hexColor.substring(5, 7), 16);
            reg.path.fillColor.red = red / 255;
            reg.path.fillColor.green = green / 255;
            reg.path.fillColor.blue = blue / 255;
            reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
            paper.view.draw();
        },

        /**
         * @function onSelectStrokeColor
         * @returns {void}
         */
        onSelectStrokeColor: function onSelectStrokeColor() {
            var reg = me.currentColorRegion;
            switch( $('#selectStrokeColor')[0].selectedIndex ) {
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
         * @returns {void}
         */
        onAlphaSlider: function onAlphaSlider(value) {
            $('#alphaFill').val(value);
            var reg = me.currentColorRegion;
            reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
            paper.view.draw();
        },

        /**
         * @function onAlphaInput
         * @returns {void}
         */
        onAlphaInput: function onAlphaInput(value) {
            $('#alphaSlider').val(value);
            var reg = me.currentColorRegion;
            reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
            paper.view.draw();
        },

        /**
         * @function onStrokeWidthDec
         * @returns {void}
         */
        onStrokeWidthDec: function onStrokeWidthDec() {
            var reg = me.currentColorRegion;
            reg.path.strokeWidth = Math.max(me.region.path.strokeWidth - 1, 1);
            paper.view.draw();
        },

        /**
         * @function onStrokeWidthInc
         * @returns {void}
         */
        onStrokeWidthInc: function onStrokeWidthInc() {
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
        cmdUndo: function cmdUndo() {
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
        cmdRedo: function cmdRedo() {
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
         * @returns {Object}
         */
        getUndo: function getUndo() {
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
         * @returns {void}
         */
        saveUndo: function saveUndo(undoInfo) {
            me.UndoStack.push(undoInfo);
            me.RedoStack = [];
        },

        /**
         * @function setImage
         * @returns {void}
         */
        setImage: function setImage(imageNumber) {
            if( me.debug ) { console.log("> setImage"); }
            var index = me.imageOrder.indexOf(imageNumber);

            // update image slider
            me.updateSliderValue(index);

            me.loadImage(me.imageOrder[index]);
        },

        /**
         * @function applyUndo
         * @desc Restore the current state from an undo object.
         * @returns {void}
         */
        applyUndo: function applyUndo(undo) {
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
            me.drawingPolygonFlag = me.undo.drawingPolygonFlag;
        },

        /**
         * @function commitMouseUndo
         * @desc If we have actually made a change with a mouse operation, commit the undo information.
         * @returns {void}
         */
        commitMouseUndo: function commitMouseUndo() {
            if( me.mouseUndo !== null ) {
                me.saveUndo(me.mouseUndo);
                me.mouseUndo = null;
            }
        },

        /**
         * @function finishDrawingPolygon
         * @desc Tool selection
         * @returns {void}
         */
        finishDrawingPolygon: function finishDrawingPolygon(closed) {
                // finished the drawing of the polygon
                if( closed === true ) {
                    me.region.path.closed = true;
                    me.region.path.fillColor.alpha = me.config.defaultFillAlpha;
                } else {
                    me.region.path.fillColor.alpha = 0;
                }
                me.region.path.fullySelected = true;
                //region.path.smooth();
                me.drawingPolygonFlag = false;
                me.commitMouseUndo();
        },

        /**
         * @function backToPreviousTool
         * @returns {void}
         */
        backToPreviousTool: function backToPreviousTool(prevTool) {
            setTimeout(function() {
                me.selectedTool = prevTool;
                me.selectTool();
            }, 500);
        },

        /**
         * @function backToSelect
         * @returns {void}
         */
        backToSelect: function backToSelect() {
            setTimeout(function() {
                me.selectedTool = "select";
                me.selectTool();
            }, 500);
        },

        /**
         * @function cmdDeleteSelected
         * @desc This function deletes the currently selected object.
         * @returns {void}
         */
        cmdDeleteSelected: function cmdDeleteSelected() {
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
        cmdPaste: function cmdPaste() {
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
                var color = me.regionHashColor(reg.name);
                reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
                me.newRegion({name:me.copyRegion.name, path:reg.path});
            }
            paper.view.draw();
        },

        /**
         * @function cmdCopy
         * @returns {void}
         */
        cmdCopy: function cmdCopy() {
            if( me.region !== null ) {
                var json = me.region.path.exportJSON();
                me.copyRegion = JSON.parse(JSON.stringify(me.region));
                me.copyRegion.path = json;
                console.log( "< copy " + me.copyRegion.name );
            }
        },

        /**
         * @function toolSelection
         * @returns {void}
         */
        toolSelection: function toolSelection() {
            if( me.debug ) {
                console.log("> toolSelection");
            }

            //end drawing of polygons and make open form
            if( me.drawingPolygonFlag === true ) {
                me.finishDrawingPolygon(true);
            }

            var prevTool = me.selectedTool;
            me.selectedTool = $(this).attr("id");
            me.selectTool();

            switch(me.selectedTool) {
                case "select":
                case "addpoint":
                case "delpoint":
                case "addregion":
                case "delregion":
                case "draw":
                case "rotate":
                case "draw-polygon":
                    me.navEnabled = false;
                    break;
                case "zoom":
                    me.navEnabled = true;
                    me.handle = null;
                    break;
                case "delete":
                    me.cmdDeleteSelected();
                    me.backToPreviousTool(prevTool);
                    break;
                case "save":
                    me.microdrawDBSave();
                    me.backToPreviousTool(prevTool);
                    break;
                case "zoom-in":
                case "zoom-out":
                case "home":
                    me.backToPreviousTool(prevTool);
                    break;
                case "prev":
                    me.loadPreviousImage();
                    me.backToPreviousTool(prevTool);
                    break;
                case "next":
                    me.loadNextImage();
                    me.backToPreviousTool(prevTool);
                    break;
                case "copy":
                    me.cmdCopy();
                    //me.backToPreviousTool(prevTool);
                    me.backToSelect();
                    break;
                case "paste":
                    me.cmdPaste();
                    //me.backToPreviousTool(prevTool);
                    me.backToSelect();
                    break;
                case "simplify":
                    me.simplify(me.region);
                    //me.backToPreviousTool(prevTool);
                    me.backToSelect();
                    break;
                case "flip":
                    me.flipRegion(me.region);
                    //backToPreviousTool(prevTool);
                    me.backToSelect();
                    break;
                case "closeMenu":
                    me.toggleMenu();
                    me.backToPreviousTool(prevTool);
                    break;
                case "openMenu":
                    me.toggleMenu();
                    me.backToPreviousTool(prevTool);
                    break;
                case "toPolygon":
                    me.bezierToPolygon();
                    me.backToPreviousTool(prevTool);
                    break;
                case "toBezier":
                    me.polygonToBezier();
                    me.backToPreviousTool(prevTool);
                    break;
                case "screenshot":
                    me.viewer.screenshotInstance.toggleScreenshotMenu();
                    me.backToPreviousTool(prevTool);
                    break;
            }
        },

        /**
         * @function selectTool
         * @returns {void}
         */
        selectTool: function selectTool() {
            if( me.debug ) { console.log("> selectTool"); }

            $("img.button").removeClass("selected");
            $("img.button#" + me.selectedTool).addClass("selected");
            //$("svg").removeClass("selected");
            //$("svg#" + me.selectedTool).addClass("selected");
        },


        /*
         Annotation storage
        */

        /**
         * @function microdrawDBSave
         * @desc Save SVG overlay to microdrawDB
         * @returns {void}
         */
        microdrawDBSave: function microdrawDBSave() {
            if( me.debug ) {
                console.log("> save promise");
            }

            // key
            var key = "regionPaths";
            var savedSlices = "Saving slices: ";
            var i;

            for( var sl in me.ImageInfo ) {
                if ((me.config.multiImageSave === false) && (sl !== me.currentImage)) {
                    continue;
                }
                // configure value to be saved
                var slice = me.ImageInfo[sl];
                var value = {};
                value.Regions = [];
                for( i = 0; i < slice.Regions.length; i += 1 ) {
                    var el = {};
                    el.path = JSON.parse(slice.Regions[i].path.exportJSON());
                    el.name = slice.Regions[i].name;
                    value.Regions.push(el);
                }

                // check if the slice annotations have changed since loaded by computing a hash
                var h = me.hash(JSON.stringify(value.Regions)).toString(16);
                if( me.debug > 1 ) { console.log("hash:", h, "original hash:", slice.Hash); }
                // if the slice hash is undefined, this slice has not yet been loaded. do not save anything for this slice
                if( typeof slice.Hash === "undefined" || h === slice.Hash ) {
                    if( me.debug > 1 ) { console.log("No change, no save"); }
                    value.Hash = h;
                    continue;
                }
                value.Hash = h;
                savedSlices += sl.toString() + " ";

                // post data to database
                (function(sl2, h2) {
                    console.log('saving slice ', sl2);
                    var data = {
                            action: "save",
                            source: me.source,
                             slice: sl2,
                               key: key,
                             value: JSON.stringify(value)
                    };
                    $.ajax({
                        url:me.dbroot,
                        type:"POST",
                        data: data,
                        success: function(result) {
                            console.log("< microdrawDBSave resolve: Successfully saved regions:", me.ImageInfo[sl2].Regions.length, "slice: " + sl2.toString(), "response:", result);
                            //update hash
                            me.ImageInfo[sl2].Hash = h2;
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            console.log("< microdrawDBSave resolve: ERROR: " + textStatus + " " + errorThrown, "slice: " + sl2.toString());
                        }
                    });
                }(sl, h));

                //show dialog box with timeout
                $('#saveDialog')
                    .html(savedSlices)
                    .fadeIn();
                setTimeout(function() {
                    $("#saveDialog")
                    .fadeOut(500);
                }, 2000);
            }
        },

        /**
         * @function microdrawDBLoad
         * @returns {Promise}
         */
        microdrawDBLoad: function microdrawDBLoad() {

        /*
            Load SVG overlay from microdrawDB
        */
            if( me.debug ) { console.log("> microdrawDBLoad promise"); }

            var def = new $.Deferred();
            var key = "regionPaths";

            $.get(me.dbroot, {
                action: "load_last",
                source: me.source,
                slice: me.slice,
                key: key
            }).success(function (data) {
                var i, json, reg;

                console.log("INSIDE!!!");
                me.annotationLoadingFlag = false;

                // Because of asynchrony, the slice that just loaded may not be the one that the user
                // intended to get. If the slice that was just loaded does not correspond to the current slice,
                // do not display this one and load the current slice.
                if( me.slice !== me.currentImage ) {
                    me.microdrawDBLoad()
                    .then(function() {
                        $("#regionList").height($(window).height()-$("#regionList").offset().top);
                        me.updateRegionList();
                        paper.view.draw();
                    });
                    def.fail();

                    return;
                }

                // if there is no data on the current slice
                // save hash for the image none the less
                if( $.isEmptyObject(data) ) {
                    me.ImageInfo[me.currentImage].Hash = me.hash(JSON.stringify(me.ImageInfo[me.currentImage].Regions)).toString(16);

                    return;
                }

                // parse the data and add to the current canvas
                console.log("[", data, "]");
                //obj = JSON.parse(data);
                //obj = data;
                //if( obj ) {
                for( i = 0; i < data.Regions.length; i += 1 ) {
                    reg = {};
                    reg.name = data.Regions[i].name;
                    reg.page = data.Regions[i].page;
                    json = data.Regions[i].path;
                    reg.path = new paper.Path();

                    /** @todo Remove workaround once paperjs will be fixed */
                    var {insert} = reg.path.insert;
                    reg.path.importJSON(json);
                    reg.path.insert = insert;

                    me.newRegion({name:reg.name, path:reg.path});
                }
                paper.view.draw();
                // if image has no hash, save one
                me.ImageInfo[me.currentImage].Hash = (data.Hash ? data.Hash : me.hash(JSON.stringify(me.ImageInfo[me.currentImage].Regions)).toString(16));


                if( me.debug ) { console.log("< microdrawDBLoad resolve success. Number of regions:", me.ImageInfo[me.currentImage].Regions.length); }
                def.resolve();
            })
            .error(function(jqXHR, textStatus, errorThrown) {
                console.log("< microdrawDBLoad resolve ERROR: " + textStatus + " " + errorThrown);
                me.annotationLoadingFlag = false;
            });

            return def.promise();
        },

        /*
            Get my IP
        */
        /*
        microdrawDBIP: function microdrawDBIP() {
            if( me.debug ) console.log("> microdrawDBIP promise");

            $("#regionList").html("<br />Connecting to database...");
            return $.get(me.dbroot, {
                "action":"remote_address"
            }).success(function(data) {
                if( me.debug ) console.log("< microdrawDBIP resolve: success");
                $("#regionList").html("");
                myIP = data;
            }).error(function(jqXHR, textStatus, errorThrown) {
                console.log("< microdrawDBIP resolve: ERROR, " + textStatus + ", " + errorThrown);
                $("#regionList").html("<br />Error: Unable to connect to database.");
            });
        },
        */

        /**
         * @function save
         * @returns {void}
         */
        save: function save() {
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
        load: function load() {
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
         * @returns {void}
         */
        loadImage: function loadImage(imageIndex) {
            if( me.debug ) { console.log("> loadImage(" + imageIndex + ")"); }
            // save previous image for some (later) cleanup
            me.prevImage = me.currentImage;

            // set current image to new image
            me.currentImage = imageIndex;

            me.viewer.open(me.ImageInfo[me.currentImage].source);
        },

        /**
         * @function loadNextImage
         * @returns {void}
         */
        loadNextImage: function loadNextImage() {
            if( me.debug ) { console.log("> loadNextImage"); }
            var index = me.imageOrder.indexOf(me.currentImage);
            var nextIndex = (index + 1) % me.imageOrder.length;

            // update image slider
            me.updateSliderValue(nextIndex);

            me.loadImage(me.imageOrder[nextIndex]);
        },

        /**
         * @function loadPreviousImage
         * @returns {void}
         */
        loadPreviousImage: function loadPreviousImage() {
            console.log("> loadPrevImage");
            var index = me.imageOrder.indexOf(me.currentImage);
            var previousIndex = ((index - 1 >= 0)? index - 1 : me.imageOrder.length - 1 );

            // update image slider
            me.updateSliderValue(previousIndex);

            me.loadImage(me.imageOrder[previousIndex]);
        },


        /**
         * @function resizeAnnotationOverlay
         * @returns {void}
         */
        resizeAnnotationOverlay: function resizeAnnotationOverlay() {
            if( me.debug ) { console.log("> resizeAnnotationOverlay"); }

            var width = $("body").width();
            var height = $("body").height();
            $("canvas.overlay").width(width);
            $("canvas.overlay").height(height);
            paper.view.viewSize = [
                width,
                height
            ];
        },

        /**
         * @function initAnnotationOverlay
         * @returns {void}
         */
        initAnnotationOverlay: function initAnnotationOverlay() {
            if( me.debug ) { console.log("> initAnnotationOverlay"); }

            // do not start loading a new annotation if a previous one is still being loaded
            if(me.annotationLoadingFlag === true) {
                return;
            }

            //console.log("new overlay size" + me.viewer.world.getItemAt(0).getContentSize());

            /*
               Activate the paper.js project corresponding to this slice. If it does not yet
               exist, create a new canvas and associate it to the new project. Hide the previous
               slice if it exists.
           */


            // change current slice index (for loading and saving)
            me.slice = me.currentImage;

            // hide previous slice
            if( me.prevImage && paper.projects[me.ImageInfo[me.prevImage].projectID] ) {
                paper.projects[me.ImageInfo[me.prevImage].projectID].activeLayer.visible = false;
                $(paper.projects[me.ImageInfo[me.prevImage].projectID].view.element).hide();
            }

            // if this is the first time a slice is accessed, create its canvas, its project,
            // and load its regions from the database
            if( typeof me.ImageInfo[me.currentImage].projectID === "undefined" ) {

                // create canvas
                var canvas = $("<canvas class='overlay' id='" + me.currentImage + "'>");
                $("body").append(canvas);

                // create project
                paper.setup(canvas[0]);
                me.ImageInfo[me.currentImage].projectID = paper.project.index;

                // load regions from database
                if( me.config.useDatabase ) {
                    me.microdrawDBLoad()
                    .then(function() {
                        $("#regionList").height($(window).height() - $("#regionList").offset().top);
                        me.updateRegionList();
                        paper.view.draw();
                    });
                }

                if( me.debug ) { console.log('Set up new project, currentImage: ' + me.currentImage + ', ID: ' + me.ImageInfo[me.currentImage].projectID); }
            }

            // activate the current slice and make it visible
            paper.projects[me.ImageInfo[me.currentImage].projectID].activate();
            paper.project.activeLayer.visible = true;
            $(paper.project.view.element).show();

            // resize the view to the correct size
            var width = $("body").width();
            var height = $("body").height();
            paper.view.viewSize = [
                width,
                height
            ];
            paper.settings.handleSize = 10;
            me.updateRegionList();
            paper.view.draw();

            /**
             * @todo Commenting this line out solves the image size issues set size of the current overlay to match the size of the current image
             */

            me.magicV = me.viewer.world.getItemAt(0).getContentSize().x / 100;

            me.transform();
        },

        /**
         * @function transform
         * @returns {void}
         */
        transform: function transform() {
            //if( me.debug ) console.log("> transform");

            var z = me.viewer.viewport.viewportToImageZoom(me.viewer.viewport.getZoom(true));
            var sw = me.viewer.source.width;
            var bounds = me.viewer.viewport.getBounds(true);
            var x = me.magicV * bounds.x;
            var y = me.magicV * bounds.y;
            var w = me.magicV * bounds.width;
            var h = me.magicV * bounds.height;
            paper.view.setCenter(x + (w/2), y + (h/2));
            paper.view.zoom = (sw * z) / me.magicV;
        },

        /**
         * @function deparam
         * @returns {Object} Returns an object containing URL parametres
         */
        deparam: function deparam() {
            if( me.debug ) { console.log("> deparam"); }

            var search = location.search.substring(1);
            var result = search?JSON.parse(
                '{"'
                + search.replace(/&/g, '","').replace(/=/g, '":"')
                + '"}', function(key, value) {
                    return key === ""?value:decodeURIComponent(value);
                }
            ):{};
            if( me.debug ) {
                console.log("url parametres:", result);
            }

            return result;
        },

        /**
         * @function loginChanged
         * @returns {void} Returns a promise that is fulfilled when the user is loged in
         */
        loginChanged: function loginChanged() {
            if( me.debug ) { console.log("> loginChanged"); }

            // updateUser();

            // remove all annotations and paper projects from old user
            /*
             * @todo Maybe save to db??
             */

            var i;
            paper.projects[me.ImageInfo[me.currentImage].projectID].activeLayer.visible = false;
            $(paper.projects[me.ImageInfo[me.currentImage].projectID].view.element).hide();
            for( i = 0; i < me.imageOrder.length; i += 1 ) {

                me.ImageInfo[me.imageOrder[i]].Regions = [];
                if( typeof me.ImageInfo[me.imageOrder[i]].projectID !== "undefined" ) {
                    paper.projects[me.ImageInfo[me.imageOrder[i]].projectID].clear();
                    paper.projects[me.ImageInfo[me.imageOrder[i]].projectID].remove();
                    delete me.ImageInfo[me.imageOrder[i]].projectID;
                }
                $("<canvas class='overlay' id='" + me.currentImage + "'>").remove();
            }

            //load new users data

            me.viewer.open(me.ImageInfo[me.currentImage].source);
        },

        /**
         * @function makeSVGInline
         * @returns {Promise} Returns a promise that is fulfilled when the SVG data is loaded
         */
        makeSVGInline: function makeSVGInline() {
            if( me.debug ) { console.log("> makeSVGInline promise"); }

            var def = new $.Deferred();
            $('img.button').each(function() {
                var $img = $(this);
                var imgID = $img.attr('id');
                var imgClass = $img.attr('class');
                var imgURL = $img.attr('src');

                $.get(imgURL, function(data) {
                    // Get the SVG tag, ignore the rest
                    var $svg = $(data).find('svg');

                    // Add replaced image's ID to the new SVG
                    if( typeof imgID !== 'undefined' ) {
                        $svg = $svg.attr('id', imgID);
                    }
                    // Add replaced image's classes to the new SVG
                    if( typeof imgClass !== 'undefined' ) {
                        $svg = $svg.attr('class', imgClass + ' replaced-svg');
                    }

                    // Remove any invalid XML tags as per http://validator.w3.org
                    $svg = $svg.removeAttr('xmlns:a');

                    // Replace image with new SVG
                    $img.replaceWith($svg);

                    if( me.debug ) {
                        console.log("< makeSVGInline resolve: success");
                    }
                    def.resolve();
                }, 'xml');
            });

            return def.promise();
        },

        /**
         * @function updateSliceName
         * @returns {void}
         */
        updateSliceName: function updateSliceName() {
            $("#slice-name").val(me.currentImage);
            var slashIndex = me.params.source.lastIndexOf("/") + 1;
            var filename = me.params.source.substr(slashIndex);
            $("title").text("MicroDraw|" + filename + "|" + me.currentImage);
        },

        /**
         * @function initShortCutHandler
         * @returns {void}
         */
        initShortCutHandler: function initShortCutHandler() {
            $(document).keydown(function(e) {
                var key = [];
                if( e.ctrlKey ) { key.push("^"); }
                if( e.altKey ) { key.push("alt"); }
                if( e.shiftKey ) { key.push("shift"); }
                if( e.metaKey ) { key.push("cmd"); }
                key.push(String.fromCharCode(e.keyCode));
                key = key.join(" ");
                if( me.shortCuts[key] ) {
                    var shortcut = me.shortCuts[key];
                    shortcut();
                    e.preventDefault();
                }
            });
        },

        /**
         * @function shortCutHandler
         * @param {string} theKey Key used for the shortcut
         * @param {function} callback Function called for the specific key shortcut
         * @returns {void}
         */
        shortCutHandler: function shortCutHandler(theKey, callback) {
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
         * @desc Initialises a slider to easily change between slices
         * @param {number} minVal Minimum value
         * @param {number} maxVal Maximum value
         * @param {number} step Increase from one slider position to the next
         * @param {number} defaultValue Value at which the slider is initialised
         * @returns {void}
         */
        initSlider: function initSlider(minVal, maxVal, step, defaultValue) {
            if( me.debug ) { console.log("> initSlider promise"); }
            var slider = $("#slider");
            if( slider.length > 0 ) { // only if slider could be found
                slider.attr("min", minVal);
                slider.attr("max", maxVal - 1);
                slider.attr("step", step);
                slider.val(defaultValue);

                slider.on("change", function() {
                    me.sliderOnChange(this.value);
                });

                // Input event can only be used when not using database, otherwise the annotations will be loaded several times
                /** @todo Fix the issue with the annotations for real */

                if (me.config.useDatabase === false) {
                    slider.on("input", function () {
                        me.sliderOnChange(this.value);
                    });
                }
            }
        },

        /**
         * @function sliderOnChange
         * @desc Called when the slider value is changed to load a new slice
         * @param {number} newImageIndex Index of the image selected using the slider
         * @returns {void}
         */
        sliderOnChange: function sliderOnChange(newImageIndex) {
            if( me.debug ) {
                console.log("> sliderOnChange promise");
            }
            var imageNumber = me.imageOrder[newImageIndex];
            me.loadImage(imageNumber);
        },

        /**
         * @function updateSliderValue
         * @desc Used to update the slider value if the slice was changed by another control
         * @param {number} newIndex Slice number to which the slider will be set
         * @returns {void}
         */
        updateSliderValue: function updateSliderValue(newIndex) {
            if( me.debug ) {
                console.log("> updateSliderValue promise");
            }
            var slider = $("#slider");
            if( slider.length > 0 ) { // only if slider could be found
                slider.val(newIndex);
            }
        },

        /**
         * @function findSliceNumber
         * @param {String} numberStr Slice number
         * @returns {void}
         */
        findSliceNumber: function findSliceNumber(numberStr) {

        /*
            Searches for the given slice-number.
            If the number could be found its index will be returned. Otherwise -1
        */
            var number = parseInt(numberStr, 10); // number = NaN if cast to int failed!
            var i;
            if( !isNaN(number) ) {
                for( i = 0; i < me.imageOrder.length; i += 1 ) {
                        var sliceNumber = parseInt(me.imageOrder[i], 10);
                        // Compare the int values because the string values might be different (e.g. "0001" != "1")
                        if( number === sliceNumber ) {
                            return i;
                        }
                }
            }

            return -1;
        },

        /**
         * @function sliceNameOnEnter
         * @param {Object} event Event produced by the enter key
         * @returns {void}
         */
        sliceNameOnEnter: function sliceNameOnEnter(event) {

        /*
            Eventhandler to open a specific slice by the enter key
        */
            if( me.debug ) {
                console.log("> sliceNameOnEnter promise");
            }
            if( event.keyCode === 13 ) { // enter key
                var sliceNumber = $(this).val();
                var index = me.findSliceNumber(sliceNumber);
                if( index > -1 ) { // if slice number exists
                    me.updateSliderValue(index);
                    me.loadImage(me.imageOrder[index]);
                }
            }
            event.preventDefault(); // prevent the default action (scroll / move caret)
        },

        /**
         * @function loadConfiguration
         * @returns {void}
         */
        loadConfiguration: function loadConfiguration() {
            var def = new $.Deferred();
            var i;
            // load general microdraw configuration
            $.getJSON("js/configuration.json", function(data) {
                me.config = data;

                var drawingTools = [
                                "select",
                                "draw",
                                "draw-polygon",
                                "simplify",
                                "addpoint",
                                "delpoint",
                                "addregion",
                                "delregion",
                                "splitregion",
                                "rotate",
                                "save",
                                "copy",
                                "paste",
                                "delete"
                ];
                if( me.config.drawingEnabled === false ) {
                    // remove drawing tools from ui
                    for( i = 0; i < drawingTools.length; i += 1 ) {
                        $("#" + drawingTools[i]).remove();
                    }

                }
                for( i = 0; i < me.config.removeTools.length; i += 1 ) {
                    $("#" + me.config.removeTools[i]).remove();
                }
                if( me.config.useDatabase === false ) {
                    $("#save").remove();
                }
                def.resolve();
            });

            return def.promise();
        },

        /**
         * @function initMicrodraw
         * @returns {void}
         */
        initMicrodraw: function initMicrodraw() {
            if( me.debug ) {
                console.log("> initMicrodraw promise");
            }

            var def = new $.Deferred();

            // Subscribe to login changes
            //MyLoginWidget.subscribe(loginChanged);

            // Enable click on toolbar buttons
            $("img.button").click(me.toolSelection);

            // set annotation loading flag to false
            me.annotationLoadingFlag = false;

            // Initialize the control key handler and set shortcuts
            me.initShortCutHandler();
            me.shortCutHandler({pc:'^ z', mac:'cmd z'}, me.cmdUndo);
            me.shortCutHandler({pc:'^ y', mac:'cmd y'}, me.cmdRedo);
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
            me.selectedTool = "zoom";
            me.selectTool();

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
                        me.initMicrodraw2(obj);
                        def.resolve();
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
                        me.initMicrodraw2(obj);
                        def.resolve();
                    }
                });
            }

            // Change current slice by typing in the slice number and pessing the enter key
            $("#slice-name").keyup(me.sliceNameOnEnter);

            // Show and hide menu
            if( me.config.hideToolbar ) {
                var mousePosition;
                var animating = false;
                $(document).mousemove(function (e) {
                    if( animating ) {
                        return;
                    }
                    mousePosition = e.clientX;

                    if( mousePosition <= 100 ) {
                        //SLIDE IN MENU
                        animating = true;
                        $('#menuBar').animate({
                            left: 0,
                            opacity: 1
                        }, 200, function () {
                            animating = false;
                        });
                    } else if( mousePosition > 200 ) {
                        animating = true;
                        $('#menuBar').animate({
                            left: -100,
                            opacity: 0
                        }, 500, function () {
                            animating = false;
                        });
                    }
                });
            }

            $(window).resize(function() {
                $("#regionList").height($(window).height() - $("#regionList").offset().top);
                me.resizeAnnotationOverlay();
            });

            me.appendRegionTagsFromOntology(Ontology);

            return def.promise();
        },

        /**
         * @function initMicrodraw2
         * @param {Object} obj DZI json configuration object
         * @returns {void}
         */
        initMicrodraw2: function initMicrodraw2(obj) {
            if( me.debug ) {
                console.log("json file:", obj);
            }

            // for loading the bigbrain
            if( obj.tileCodeY ) {
                obj.tileSources = eval(obj.tileCodeY);
            }

            // set up the ImageInfo array and me.imageOrder array
            console.log(obj);
            var i;
            for( i = 0; i < obj.tileSources.length; i += 1 ) {
                // name is either the index of the tileSource or a named specified in the json file
                var name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
                me.imageOrder.push(name);
                me.ImageInfo[name] = {
                    source: obj.tileSources[i],
                    Regions: []
                };
                // if getTileUrl is specified, we might need to eval it to get the function
                if( obj.tileSources[i].getTileUrl && typeof obj.tileSources[i].getTileUrl === 'string' ) {
                    eval("me.ImageInfo[name]['source'].getTileUrl = " + obj.tileSources[i].getTileUrl);
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
            me.initSlider(0, obj.tileSources.length, 1, Math.round(obj.tileSources.length / 2));
            me.currentImage = me.imageOrder[Math.floor(obj.tileSources.length / 2)];

            me.params.tileSources = obj.tileSources;
            me.viewer = new OpenSeadragon({
                id: "openseadragon1",
                prefixUrl: "lib/openseadragon/images/",
                tileSources: [],
                showReferenceStrip: false,
                referenceStripSizeRatio: 0.2,
                showNavigator: true,
                sequenceMode: false,
                navigatorId:"myNavigator",
                zoomInButton:"zoom-in",
                zoomOutButton:"zoom-out",
                homeButton:"home",
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

            // add screenshot
            me.viewer.screenshot({
                showOptions: true, // Default is false
                keyboardShortcut: 'p', // Default is null
                showScreenshotControl: true // Default is true
            });

            // add handlers: update slice name, animation, page change, mouse actions
            me.viewer.addHandler('open', function () {
                me.initAnnotationOverlay();
                me.updateSliceName();
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
                {tracker: 'viewer', handler: 'dragEndHandler', hookHandler: me.dragEndHandler}
            ]});

            if( me.debug ) {
                console.log("< initMicrodraw2 resolve: success");
            }
        },

        /**
         * @function toggleMenu
         * @return {void}
         */
        toggleMenu: function toggleMenu() {
            if( $('#menuBar').css('display') === 'none' ) {
                $('#menuBar').css('display', 'block');
                $('#menuButton').css('display', 'none');
            } else {
                $('#menuBar').css('display', 'none');
                $('#menuButton').css('display', 'block');
            }
        },

        init: function init() {
            $.when(me.loadConfiguration())
            .then(function () {
                if( me.config.useDatabase ) {
                    $.when(
                        // microdrawDBIP(),
                        // MyLoginWidget.init()
                    )
                    .then(function () {
                        me.params = me.deparam();
                        me.slice = me.currentImage;
                        me.source = me.params.source;
                        // updateUser();
                    })
                    .then(me.initMicrodraw);
                } else {
                    me.params = me.deparam();
                    me.initMicrodraw();
                }
            });
        }
    };

    return me;
})();

/*
    // Log microdraw
    //microdrawDBSave(JSON.stringify(myOrigin), "entered", null);

    // load SVG overlay from localStorage
    microdrawDBLoad();
    //load();
*/
//})();

// For emacs users - set up the tabbing appropriately.
// Local Variables:
// mode: Javascript
// indent-tabs-mode: t
// tab-width: 4
// End:
