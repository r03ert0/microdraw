//(function() {                 // force everything local.
var debug = 0;

var dbroot = "http://"+localhost+"/microdraw/php/microdraw_db.php";
var ImageInfo = {};             // regions, and projectID (for the paper.js canvas) for each slices, can be accessed by the slice name. (e.g. ImageInfo[imageOrder[viewer.current_page()]])
                                // regions contain a paper.js path, a unique ID and a name
var imageOrder = [];            // names of slices ordered by their openseadragon page numbers
var currentImage = undefined;   // name of the current image
var prevImage = undefined;      // name of the last image
var region = null;	            // currently selected region (one element of Regions[])
var copyRegion;		            // clone of the currently selected region for copy/paste
var handle;			            // currently selected control point or handle (if any)
var selectedTool;	            // currently selected tool
var viewer;			            // open seadragon viewer
var navEnabled = true;          // flag indicating whether the navigator is enabled (if it's not, the annotation tools are)
var magicV = 1000;	            // resolution of the annotation canvas - is changed automatically to reflect the size of the tileSource
var myOrigin = {};	            // Origin identification for DB storage
var	params;			            // URL parameters
var	myIP;			            // user's IP
var UndoStack = [];
var RedoStack = [];
var mouseUndo;                  // tentative undo information.
var shortCuts = [];             // List of shortcuts
var newRegionFlag;	            // true when a region is being drawn
var drawingPolygonFlag = false; // true when drawing a polygon
var annotationLoadingFlag;      // true when an annotation is being loaded
var config = {}                 // App configuration object
var isMac = navigator.platform.match(/Mac/i)?true:false;
var isIOS = navigator.platform.match(/(iPhone|iPod|iPad)/i)?true:false;

var socket=undefined;
var IAmASlave=false;

/***1
    Region handling functions
*/
function newRegion(arg, imageNumber) {
	if( debug ) console.log("> newRegion");
    var reg = {};
	
	reg.uid = regionUniqueID();
	if( arg.name ) {
		reg.name = arg.name;
	}
	else {
		reg.name = "Untitled " + reg.uid;
	}

	var color = regionHashColor(reg.name);
	
	if( arg.path ) {
		reg.path = arg.path;
        reg.path.strokeWidth = arg.path.strokeWidth ? arg.path.strokeWidth : 1;
        reg.path.strokeColor = arg.path.strokeColor ? arg.path.strokeColor : 'black';
		reg.path.strokeScaling = false;
		reg.path.fillColor = arg.path.fillColor ? arg.path.fillColor :'rgba('+color.red+','+color.green+','+color.blue+',0.5)';
		reg.path.selected = false;
	}

	if( imageNumber === undefined ) {
		imageNumber = currentImage;
	}
	if( imageNumber === currentImage ) {
		// append region tag to regionList
		var el = $(regionTag(reg.name,reg.uid));
		$("#regionList").append(el);

		// handle single click on computers
		el.click(singlePressOnRegion);
	
		// handle double click on computers
		el.dblclick(doublePressOnRegion);
	
		// handle single and double tap on touch devices
		/*
		  RT: it seems that a click event is also fired on touch devices,
		  making this one redundant
		*/
		el.on("touchstart",handleRegionTap);
	}

    // Select region name in list
    $("#regionList > .region-tag").each(function(i){
        $(this).addClass("deselected");
        $(this).removeClass("selected");
    });

    var tag = $("#regionList > .region-tag#" + reg.uid);
    $(tag).removeClass("deselected");
    $(tag).addClass("selected");

	// push the new region to the Regions array
	ImageInfo[imageNumber]["Regions"].push(reg);
    return reg;
}

function removeRegion(reg, imageNumber) {
	if( debug ) console.log("> removeRegion");
	
	if( imageNumber === undefined ) {
		imageNumber = currentImage;
	}
	
	// remove from Regions array
	ImageInfo[imageNumber]["Regions"].splice(ImageInfo[imageNumber]["Regions"].indexOf(reg),1);
	// remove from paths
	reg.path.remove();
	if( imageNumber == currentImage ) {
		// remove from regionList
		var	tag = $("#regionList > .region-tag#" + reg.uid);
		$(tag).remove();
	}
}

function selectRegion(reg) {
    if( debug ) console.log("> selectRegion");

    var i;

    // Select path
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        if( ImageInfo[currentImage]["Regions"][i] == reg ) {
            reg.path.selected = true;
            reg.path.fullySelected = true;
            region = reg;
        } else {
            ImageInfo[currentImage]["Regions"][i].path.selected = false;
            ImageInfo[currentImage]["Regions"][i].path.fullySelected = false;
        }
    }
    paper.view.draw();

    // Select region name in list
    $("#regionList > .region-tag").each(function(i){
        $(this).addClass("deselected");
        $(this).removeClass("selected");
    });

    var tag = $("#regionList > .region-tag#" + reg.uid);
    $(tag).removeClass("deselected");
    $(tag).addClass("selected");

    if(debug) console.log("< selectRegion");
}

function findRegionByUID(uid) {
    if( debug ) console.log("> findRegionByUID");

    var i;
    if( debug > 2 ) console.log( "look for uid: " + uid);
    // if( debug > 2 ) console.log( ImageInfo );
    if( debug > 2 ) console.log( "region array lenght: " + ImageInfo[currentImage]["Regions"].length );

    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        
        if( ImageInfo[currentImage]["Regions"][i].uid == uid ) {
            if( debug > 2 ) console.log( "region " + ImageInfo[currentImage]["Regions"][i].uid + ": " );
            if( debug > 2 ) console.log( ImageInfo[currentImage]["Regions"][i] );
            return ImageInfo[currentImage]["Regions"][i];
        }
    }
    console.log("Region with unique ID "+uid+" not found");
    return null;
}

function findRegionByName(name) {
    if( debug ) console.log("> findRegionByName");

    var i;
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        if( ImageInfo[currentImage]["Regions"][i].name == name ) {
            return ImageInfo[currentImage]["Regions"][i];
        }
    }
    console.log("Region with name " + name + " not found");
    return null;
}

var counter = 1;
function regionUniqueID() {
    if( debug ) console.log("> regionUniqueID");

    var i;
    var found = false;
    while( found == false ) {
        found = true;
        for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
            if( ImageInfo[currentImage]["Regions"][i].uid == counter ) {
                counter++;
                found = false;
                break;
            }
        }
    }
    return counter;
}

function hash(str) {
    var result = str.split("").reduce(function(a,b) {
        a = ((a<<5)-a) + b.charCodeAt(0); 
        return a&a;
    },0);
    return result;
}

function regionHashColor(name) {
    //if(debug) console.log("> regionHashColor");

    var color = {};
    var h = hash(name);

    // add some randomness
    h = Math.sin(h++)*10000;
    h = 0xffffff*(h-Math.floor(h));

    color.red = h&0xff;
    color.green = (h&0xff00)>>8;
    color.blue = (h&0xff0000)>>16;
    return color;
}

function regionTag(name,uid) {
    //if( debug ) console.log("> regionTag");

    var str;
    var color = regionHashColor(name);
    if( uid ) {
        var reg = findRegionByUID(uid);
        var mult = 1.0;
        if( reg ) {
            mult = 255;
            color = reg.path.fillColor;
        }
        else {
            color = regionHashColor(name);
        }
        str = [ "<div class='region-tag' id='" + uid + "' style='padding:2px'>",
                "<img class='eye' title='Region visible' id='eye_" + uid + "' src='img/eyeOpened.svg' />",
                "<div class='region-color'",
                "style='background-color:rgba(",
                parseInt(color.red*mult),",",parseInt(color.green*mult),",",parseInt(color.blue*mult),",0.67",
                ")'></div>",
                "<span class='region-name'>" + name + "</span>",
                "</div>",
                ].join(" ");
    }
    else {
        color = regionHashColor(name);
        str = [ "<div class='region-tag' style='padding:2px'>",
                "<div class='region-color'",
                "style='background-color:rgba(",
                color.red,",",color.green,",",color.blue,",0.67",
                ")'></div>",
                "<span class='region-name'>" + name + "</span>",
                "</div>",
                ].join(" ");
    }
    return str; 
}

function appendRegionTagsFromOntology(o) {
    if( debug ) console.log("> appendRegionTagsFromOntology");

    for( var i = 0; i < o.length; i++ ) {
        if( o[i].parts ) {
            $("#regionPicker").append("<div>"+o[i].name+"</div>");
            appendRegionTagsFromOntology(o[i].parts);
        }
        else {
            var tag = regionTag(o[i].name);
            var el = $(tag).addClass("ontology");
            $("#regionPicker").append(el);

            // handle single click on computers
            el.click(singlePressOnRegion);

            // handle double click on computers
            el.dblclick(doublePressOnRegion);

            el.on("touchstart",handleRegionTap);
        }
    }
}

function regionPicker(parent) {
    if( debug ) console.log("> regionPicker");

    $("div#regionPicker").appendTo("body");
    $("div#regionPicker").show();
}

function changeRegionName(reg,name) {
    if( debug ) console.log("> changeRegionName");

    var i;
    var color = regionHashColor(name);

    // Update path
    reg.name = name;
    reg.path.fillColor = 'rgba('+color.red+','+color.green+','+color.blue+',0.5)';
    paper.view.draw();

    // Update region tag
    $(".region-tag#" + reg.uid + ">.region-name").text(name);
    $(".region-tag#" + reg.uid + ">.region-color").css('background-color','rgba('+color.red+','+color.green+','+color.blue+',0.67)');
}

/*** toggle visibility of region 
***/
function toggleRegion(reg) {
    if( region !== null ) {
        if( debug ) console.log("> toggle region"); 

        var color = regionHashColor(reg.name);
        if( reg.path.fillColor !== null ) {
            reg.path.storeColor = reg.path.fillColor;
            reg.path.fillColor = null;

            reg.path.strokeWidth = 0;
            reg.path.fullySelected = false;
            reg.storeName = reg.name;
            //reg.name=reg.name+'*';
            $('#eye_' + reg.uid).attr('src','img/eyeClosed.svg');
        }
        else {
            reg.path.fillColor = reg.path.storeColor;
            reg.path.strokeWidth = 1;
            reg.name = reg.storeName;
            $('#eye_' + reg.uid).attr('src','img/eyeOpened.svg');
        }
        paper.view.draw();
        $(".region-tag#" + reg.uid + ">.region-name").text(reg.name);
    }
}

function updateRegionList() {
    if( debug ) console.log("> updateRegionList");

    // remove all entries in the regionList
    $("#regionList > .region-tag").each(function() {
        $(this).remove();
    });

    // adding entries corresponding to the currentImage
    for( var i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        var reg = ImageInfo[currentImage]["Regions"][i];
        // append region tag to regionList
        var el = $(regionTag(reg.name,reg.uid));
        $("#regionList").append(el);

        // handle single click on computers
        el.click(singlePressOnRegion);
        // handle double click on computers
        el.dblclick(doublePressOnRegion);
        // handle single and double tap on touch devices
        el.on("touchstart",handleRegionTap);
    }
}

function checkRegionSize(reg) {
    if( reg.path.length > 3 ) {
        return;
    }
    else {
        removeRegion(region, currentImage);
    }
}


/***2
    Interaction: mouse and tap
*/
function clickHandler(event){
    if( debug ) console.log("> clickHandler");

    event.stopHandlers = !navEnabled;
    if( selectedTool == "draw" ) {
        checkRegionSize(region);
    }
}

function pressHandler(event){
    if( debug ) console.log("> pressHandler");

    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseDown(event.originalEvent.layerX,event.originalEvent.layerY);
    }
}

function dragHandler(event){
    if( debug > 1 )
        console.log("> dragHandler");

    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseDrag(event.originalEvent.layerX,event.originalEvent.layerY,event.delta.x,event.delta.y);
    }
}

function dragEndHandler(event){
    if( debug ) console.log("> dragEndHandler");

    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseUp();
    }
}

function singlePressOnRegion(event) {
    if( debug ) console.log("> singlePressOnRegion");

    event.stopPropagation();
    event.preventDefault();

    var el = $(this);
    var uid;
    var reg;

    if( debug ) console.log(event);
    if( event.clientX > 20 ) {
        if( event.clientX > 50 ) {
    
            if( el.hasClass("ontology") ) {
                // Click on regionPicker (ontology selection list)
                var newName = el.find(".region-name").text();
                uid = $(".region-tag.selected").attr('id');
                reg = findRegionByUID(uid);
                changeRegionName(reg,newName);
                $("div#regionPicker").appendTo($("body")).hide();
            }
            else {
                // Click on regionList (list or annotated regions)
                uid = $(this).attr('id');
                reg = findRegionByUID(uid);
                if( reg ) {
                    selectRegion(reg);
                }
                else
                    console.log("region undefined");
            }
        }
        else {
            var reg = findRegionByUID(this.id);
            if( reg.path.fillColor != null ) {
                if( reg ) {
                selectRegion(reg);
                }
                annotationStyle(reg);
            }
        }
    }
    else {
        var reg = findRegionByUID(this.id);
        toggleRegion(reg);
    }
}

function doublePressOnRegion(event) {
    if( debug ) console.log("> doublePressOnRegion");

    event.stopPropagation();
    event.preventDefault();

    if( event.clientX > 20 ) {
        if( event.clientX > 50 ) {
            if( config.drawingEnabled ) {
                if( config.regionOntology == true ) {
                regionPicker(this);
                }
                else {
                    var name = prompt("Region name");
                    if( name != null ) {
                        changeRegionName(findRegionByUID(this.id), name);
                    }
                }
            }   
        }
        else {
            var reg = findRegionByUID(this.id);
            if( reg.path.fillColor != null ) {
                if( reg ) {
                selectRegion(reg);
                }
                annotationStyle(reg);
            }
        }
    }
    else {
        var reg = findRegionByUID(this.id);
        toggleRegion(reg);
    }
}

var tap = false
function handleRegionTap(event) {
/*
    Handles single and double tap in touch devices
*/
    if( debug ) console.log("> handleRegionTap");

    var caller = this;

    if( !tap ){ //if tap is not set, set up single tap
        tap = setTimeout(function() {
            tap = null
        },300); 

        // call singlePressOnRegion(event) using 'this' as context
        singlePressOnRegion.call(this,event);
    } else {
        clearTimeout(tap);
        tap = null;

        // call doublePressOnRegion(event) using 'this' as context
        doublePressOnRegion.call(this,event);
    }
    if( debug ) console.log("< handleRegionTap");
}

function mouseDown(x,y) {
    if( debug > 1 ) console.log("> mouseDown");

    mouseUndo = getUndo();
    var prevRegion = null;
    var point = paper.view.viewToProject(new paper.Point(x,y));

    handle = null;

    switch( selectedTool ) {
        case "select":
        case "addpoint":
        case "delpoint":
        case "addregion":
        case "delregion":
        case "splitregion": {
            var hitResult = paper.project.hitTest(point, {
                    tolerance: 10,
                    stroke: true,
                    segments: true,
                    fill: true,
                    handles: true
                });

            newRegionFlag = false;
            if( hitResult ) {
                var i;
                for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
                    if( ImageInfo[currentImage]["Regions"][i].path == hitResult.item ) {
                        re = ImageInfo[currentImage]["Regions"][i];
                        break;
                    }
                }

                // select path 
                if( region && region != re ) {
                    region.path.selected = false;
                    prevRegion = region;
                }
                selectRegion(re);

                if( hitResult.type == 'handle-in' ) {
                    handle = hitResult.segment.handleIn;
                    handle.point = point;
                }
                else if( hitResult.type == 'handle-out' ) {
                    handle = hitResult.segment.handleOut;
                    handle.point = point;
                }
                else if( hitResult.type == 'segment' ) {
                    if( selectedTool == "select" ) {
                        handle = hitResult.segment.point;
                        handle.point = point;
                    }
                    if( selectedTool == "delpoint" ) {
                        hitResult.segment.remove();
                        commitMouseUndo();
                    }
                }
                else if( hitResult.type == 'stroke' && selectedTool == "addpoint" ) {
                    region.path
                    .curves[hitResult.location.index]
                    .divide(hitResult.location);
                    region.path.fullySelected = true;
                    commitMouseUndo();
                    paper.view.draw();
                }
                else if( selectedTool == "addregion" ) {
                    if( prevRegion ) {
                        var newPath = region.path.unite(prevRegion.path);
                        removeRegion(prevRegion);
                        region.path.remove();
                        region.path = newPath;
                        updateRegionList();
                        selectRegion(region);
                        paper.view.draw();
                        commitMouseUndo();
                        backToSelect();
                    }
                }
                else if( selectedTool == "delregion" ) {
                    if( prevRegion ) {
                        var newPath = prevRegion.path.subtract(region.path);
                        removeRegion(prevRegion);
                        prevRegion.path.remove();
                        newRegion({path:newPath});
                        updateRegionList();
                        selectRegion(region);
                        paper.view.draw();
                        commitMouseUndo();
                        backToSelect();
                    }
                }
                else if( selectedTool == "splitregion" ) {
                    /*selected region is prevRegion! 
                    region is the region that should be split based on prevRegion
                    newRegionPath is outlining that part of region which has not been overlaid by prevRegion
                    i.e. newRegion is what was region
                    and prevRegion color should go to the other part*/
                    if( prevRegion ) {
                        var prevColor = prevRegion.path.fillColor; 
                        //color of the overlaid part
                        var color = region.path.fillColor;
                        var newPath = region.path.divide(prevRegion.path);
                        
                        removeRegion(prevRegion);
                        region.path.remove();

                        region.path = newPath;
                        var newReg;
                        for( i = 0; i < newPath._children.length; i++ )
                        {
                            if( i == 0 ) {
                                region.path = newPath._children[i];
                            }
                            else {
                                newReg = newRegion({path:newPath._children[i]});
                            }
                        }
                        region.path.fillColor = color; 
                        if( newReg ) {
                            newReg.path.fillColor = prevColor;
                        }
                        updateRegionList();
                        selectRegion(region);
                        paper.view.draw();

                        commitMouseUndo();
                        backToSelect();
                    }
                }
                break;
            }
            if( hitResult == null && region ) {
                //deselect paths
                region.path.selected = false;
                region = null;
            }
            break;
        }
        case "draw": {
            // Start a new region
            // if there was an older region selected, unselect it
            if( region ) {
                region.path.selected = false;
            }
            // start a new region
            region = newRegion({path:new paper.Path({segments:[point]})});
            // signal that a new region has been created for drawing
            newRegionFlag = true;

            commitMouseUndo();
            break;
        }
        case "draw-polygon": {
            // is already drawing a polygon or not?
            console.log(drawingPolygonFlag);
            if( drawingPolygonFlag == false ) {
                // deselect previously selected region
                if( region )
                    region.path.selected = false;
                // Start a new Region with no fill color
                region = newRegion({path:new paper.Path({segments:[point]})});
                region.path.fillColor.alpha = 0;
                region.path.selected = true;
                drawingPolygonFlag = true;
            } else {
                var hitResult = paper.project.hitTest(point, {tolerance:10, segments:true});
                if( hitResult && hitResult.item == region.path && hitResult.segment.point == region.path.segments[0].point ) {
                    // clicked on first point of current path
                    // --> close path and remove drawing flag
                    finishDrawingPolygon(true);
                } else {
                    // add point to region
                    region.path.add(point);
                }
            }
            break;
        }
        case "rotate":
            region.origin = point;
            break;
    }
    paper.view.draw();
}

function mouseDrag(x,y,dx,dy) {
    //if( debug ) console.log("> mouseDrag");

    // transform screen coordinate into world coordinate
    var point = paper.view.viewToProject(new paper.Point(x,y));

    // transform screen delta into world delta
    var orig = paper.view.viewToProject(new paper.Point(0,0));
    var dpoint = paper.view.viewToProject(new paper.Point(dx,dy));
    dpoint.x -= orig.x;
    dpoint.y -= orig.y;

    if( handle ) {
        handle.x += point.x-handle.point.x;
        handle.y += point.y-handle.point.y;
        handle.point = point;
        commitMouseUndo();
    } else
    if( selectedTool == "draw" ) {
        region.path.add(point);
    } else
    if( selectedTool == "select" ) {
        // event.stopHandlers = true;
        for( i in ImageInfo[currentImage]["Regions"] ) {
            var reg = ImageInfo[currentImage]["Regions"][i];
            if( reg.path.selected ) {
                reg.path.position.x += dpoint.x;
                reg.path.position.y += dpoint.y;
                commitMouseUndo();
            }
        }
    }
    if( selectedTool == "rotate" ) {
        event.stopHandlers = true;
        var degree = parseInt(dpoint.x);
        var i;
        for( i in ImageInfo[currentImage]["Regions"] ) {
            if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
                ImageInfo[currentImage]["Regions"][i].path.rotate(degree, region.origin);
                commitMouseUndo();
            }
        }
    }
    paper.view.draw();
}

function mouseUp() {
    if( debug ) console.log("> mouseUp");

    if( newRegionFlag == true ) {  
        region.path.closed = true;
        region.path.fullySelected = true;
        // to delete all unnecessary segments while preserving the form of the region to make it modifiable; & adding handles to the segments
        var orig_segments = region.path.segments.length;
        region.path.simplify(0);
        var final_segments = region.path.segments.length;
        if( debug > 2 ) console.log( parseInt(final_segments/orig_segments*100) + "% segments conserved" );
    }
    paper.view.draw();
}

/*** simplify the region path 
***/
function simplify() {
    if( region !== null ) {
        if( debug ) console.log("> simplifying region path");

        var orig_segments = region.path.segments.length;
        region.path.simplify();
        var final_segments = region.path.segments.length;
        console.log( parseInt(final_segments/orig_segments*100) + "% segments conserved" );
        paper.view.draw();
    }
}

/*** flip region along y-axis around its center point
***/
function flipRegion(reg) {
    if( region !== null ) {
        if( debug ) console.log("> flipping region");

        var i;
        for( i in ImageInfo[currentImage]["Regions"] ) {
            if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
                ImageInfo[currentImage]["Regions"][i].path.scale(-1, 1);
            }
        }
    paper.view.draw();
    }
}

/*** 
    the following functions serve changing the annotation style
***/
var currentColorRegion;
// add leading zeros
function pad(number, length) { 
    var str = '' + number; 
    while( str.length < length ) 
        str = '0' + str; 
    return str; 
}
/*** get current alpha & color values for colorPicker display 
***/
function annotationStyle(reg) {
    if( debug ) console.log(reg.path.fillColor);

    if( region !== null ) {
        if( debug ) console.log("> changing annotation style");
        
        currentColorRegion = reg;
        var alpha = reg.path.fillColor.alpha;
        $('#alphaSlider').val(alpha*100);
        $('#alphaFill').val(parseInt(alpha*100));

        var hexColor = '#' + pad(( parseInt(reg.path.fillColor.red * 255) ).toString(16),2) + pad(( parseInt(reg.path.fillColor.green * 255) ).toString(16),2) + pad(( parseInt(reg.path.fillColor.blue * 255) ).toString(16),2);
        if( debug ) console.log(hexColor);
        
        $('#fillColorPicker').val( hexColor );

        if( $('#colorSelector').css('display') == 'none' ) {
            $('#colorSelector').css('display', 'block');
        }
        else {
            $('#colorSelector').css('display', 'none');
        }
    }
}
/*** set picked color & alpha 
***/
function setRegionColor() {
    var reg = currentColorRegion;
    var hexColor = $('#fillColorPicker').val();
    var red = parseInt( hexColor.substring(1,3), 16 );
    var green = parseInt( hexColor.substring(3,5), 16 );
    var blue = parseInt( hexColor.substring(5,7), 16 );

    reg.path.fillColor.red = red / 255;
    reg.path.fillColor.green = green / 255;
    reg.path.fillColor.blue = blue / 255;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
    
    // update region tag
    $(".region-tag#" + reg.uid + ">.region-color").css('background-color','rgba('+red+','+green+','+blue+',0.67)');
  
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
}
/*** update all values on the fly 
***/
function onFillColorPicker(value) {
    $('#fillColorPicker').val(value);
    var reg = currentColorRegion;
    var hexColor = $('#fillColorPicker').val();
    var red = parseInt( hexColor.substring(1,3), 16 );
    var green = parseInt( hexColor.substring(3,5), 16);
    var blue = parseInt( hexColor.substring(5,7), 16);
    reg.path.fillColor.red = red / 255;
    reg.path.fillColor.green = green / 255;
    reg.path.fillColor.blue = blue / 255;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
    paper.view.draw();
}

function onSelectStrokeColor() {
    var reg = currentColorRegion;
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
}

function onAlphaSlider(value) {
    $('#alphaFill').val(value);
    var reg = currentColorRegion;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
}

function onAlphaInput(value) {
    $('#alphaSlider').val(value);
    var reg = currentColorRegion;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
}


/*** UNDO ***/

/**
 * Command to actually perform an undo.
 */
function cmdUndo() {
    if( UndoStack.length > 0 ) {
        var redoInfo = getUndo();
        var undoInfo = UndoStack.pop();
        applyUndo(undoInfo);
        RedoStack.push(redoInfo);
        paper.view.draw();
    }
}

/**
 * Command to actually perform a redo.
 */
function cmdRedo() {
    if( RedoStack.length > 0 ) {
        var undoInfo = getUndo();
        var redoInfo = RedoStack.pop();
        applyUndo(redoInfo);
        UndoStack.push(undoInfo);
        paper.view.draw();
    }
}

/**
 * Return a complete copy of the current state as an undo object.
 */
function getUndo() {
    var undo = { imageNumber: currentImage, regions: [] };
    var info = ImageInfo[currentImage]["Regions"];

    for( var i = 0; i < info.length; i++ ) {
        var el = {
            json: JSON.parse(info[i].path.exportJSON()),
            name: info[i].name,
            selected: info[i].path.selected,
            fullySelected: info[i].path.fullySelected
        }
        undo.regions.push(el);
    }
    return undo;
}

/**
 * Save an undo object. This has the side-effect of initializing the
 * redo stack.
 */
function saveUndo(undoInfo) {
	UndoStack.push(undoInfo);
	RedoStack = [];
}

function setImage(imageNumber) {
    if( debug ) console.log("> setImage");
    var index = imageOrder.indexOf(imageNumber);

    // update image slider
    update_slider_value(index);

    loadImage(imageOrder[index]);
}

/**
 * Restore the current state from an undo object.
 */
function applyUndo(undo) {
    if( undo.imageNumber !== currentImage )
        setImage(undo.imageNumber);
    var info = ImageInfo[undo.imageNumber]["Regions"];
    while( info.length > 0 )
        removeRegion(info[0], undo.imageNumber);
    region = null;
    for( var i = 0; i < undo.regions.length; i++ ) {
        var el = undo.regions[i];
		var project = paper.projects[ImageInfo[undo.imageNumber]["projectID"]];
		/* Create the path and add it to a specific project.
		 */
		var path = new paper.Path();
		project.addChild(path);
		path.importJSON(el.json);
		reg = newRegion({name:el.name, path:path}, undo.imageNumber);
		reg.path.selected = el.selected;
		reg.path.fullySelected = el.fullySelected;
		if( el.selected ) {
			if( region === null )
				region = reg;
			else
				console.log("Should not happen: two regions selected?");
		}
    }
}

/**
 * If we have actually made a change with a mouse operation, commit
 * the undo information.
 */
function commitMouseUndo() {
    if( mouseUndo !== undefined ) {
        saveUndo(mouseUndo);
        mouseUndo = undefined;
    }
}


/***3
    Tool selection
*/

function finishDrawingPolygon(closed){
        // finished the drawing of the polygon
        if( closed == true ) {
            region.path.closed = true;
            region.path.fillColor.alpha = 0.5;
        }
        region.path.fullySelected = true;
        //region.path.smooth();
        drawingPolygonFlag = false;
}

function backToPreviousTool(prevTool) {
    setTimeout(function() {
        selectedTool = prevTool;
        selectTool()
    },500);
}

function backToSelect() {
    setTimeout(function() {
        selectedTool = "select";
        selectTool()
    },500);
}

/**
 * This function deletes the currently selected object.
 */
function cmdDeleteSelected() {
    var undoInfo = getUndo();
    var i;
    for( i in ImageInfo[currentImage]["Regions"] ) {
        if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
            removeRegion(ImageInfo[currentImage]["Regions"][i]);
            saveUndo(undoInfo);
            paper.view.draw();
            break;
        }
    }
}

function cmdPaste() {
    if( copyRegion !== null ) {
        var undoInfo = getUndo();
        saveUndo(undoInfo);
        console.log( "paste " + copyRegion.name );
        if( findRegionByName(copyRegion.name) ) {
            copyRegion.name += " Copy";
        }
        var reg = JSON.parse(JSON.stringify(copyRegion));
        reg.path = new paper.Path();
        reg.path.importJSON(copyRegion.path);
        reg.path.fullySelected = true;
        var color = regionHashColor(reg.name);
        reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
        newRegion({name:copyRegion.name,path:reg.path});
    }
    paper.view.draw();
}

function cmdCopy() {
    if( region !== null ) {
    var json = region.path.exportJSON();
    copyRegion = JSON.parse(JSON.stringify(region));
    copyRegion.path = json;
    console.log( "< copy " + copyRegion.name );
    }
}

function toolSelection(event) {
    if( debug ) console.log("> toolSelection");

    //end drawing of polygons and make open form
    if( drawingPolygonFlag == true )
        finishDrawingPolygon(true);

    var prevTool = selectedTool;
    selectedTool = $(this).attr("id");
    selectTool();

    switch(selectedTool) {
        case "select":
        case "addpoint":
        case "delpoint":
        case "addregion":
        case "delregion":
        case "draw":
        case "rotate":
        case "draw-polygon":
            navEnabled = false;
            break;
        case "zoom":
            navEnabled = true;
            handle = null;
            break;
        case "delete":
            cmdDeleteSelected();
            backToPreviousTool(prevTool);
            break;
        case "save":
            microdrawDBSave();
            backToPreviousTool(prevTool);
            break;
        case "zoom-in":
        case "zoom-out":
        case "home":
            backToPreviousTool(prevTool);
            break;
        case "prev":
            loadPreviousImage();
            backToPreviousTool(prevTool);
            break;
        case "next":
            loadNextImage();
            backToPreviousTool(prevTool);
            break;
        case "copy":
            cmdCopy();
            //backToPreviousTool(prevTool);
            backToSelect();
            break;
        case "paste":
            cmdPaste();
            //backToPreviousTool(prevTool);
            backToSelect();
            break;
        case "simplify":
            simplify(region);
            //backToPreviousTool(prevTool);
            backToSelect();
            break;
        case "flip":
            flipRegion(region);
            //backToPreviousTool(prevTool);
            backToSelect();
            break;
        case "closeMenu":
            toggleMenu();
            backToPreviousTool(prevTool);
            break;
        case "openMenu":
            toggleMenu();
            backToPreviousTool(prevTool);
            break;
    }
}

function selectTool() {
    if( debug ) console.log("> selectTool");

    $("img.button").removeClass("selected");
    $("img.button#" + selectedTool).addClass("selected");
    //$("svg").removeClass("selected");
    //$("svg#"+selectedTool).addClass("selected");
}


/***4
    Annotation storage
*/

/* microdrawDB push/pull */
function microdrawDBSave() {
/*
    Save SVG overlay to microdrawDB
*/
    if( debug ) console.log("> save promise");

    // key
    var key = "regionPaths";

    for( var sl in ImageInfo ) {
        // configure value to be saved
        var slice = ImageInfo[sl];
        var value = {};
        value.Regions = [];
        for( var i = 0; i < slice.Regions.length; i++ )
        {
            var el = {};
            el.path = JSON.parse(slice.Regions[i].path.exportJSON());
            el.name = slice.Regions[i].name;
            value.Regions.push(el);
        }
    
        // check if the slice annotations have changed since loaded by computing a hash
        var h = hash(JSON.stringify(value.Regions)).toString(16);
        if( debug > 1 )
            console.log("hash:",h,"original hash:",slice.Hash);
        if( slice.Hash !== undefined && h==slice.Hash ) {
            if( debug > 1 )
                console.log("No change, no save");
            value.Hash = h;
            continue;
        }
        value.Hash = h;

        // post data to database
        $.ajax({
            url:dbroot,
            type:"POST",
            data:{
                "action":"save",
                "origin":JSON.stringify({
                    appName:myOrigin.appName,
                    slice:  sl,
                    source: myOrigin.source,
                    user:   myOrigin.user
                }),
                "key":key,
                "value":JSON.stringify(value)
            },
            success: function(data) {
                console.log("< microdrawDBSave resolve: Successfully saved regions:",slice.Regions.length,"slice: " + sl.toString(),"response:",data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("< microdrawDBSave resolve: ERROR: " + textStatus + " " + errorThrown,"slice: "+sl.toString());
            }
        });
    }
}

function microdrawDBLoad() {
/*
    Load SVG overlay from microdrawDB
*/
	if( debug ) console.log("> microdrawDBLoad promise");
	
	var	def = $.Deferred();
	var	key = "regionPaths";
	var slice = myOrigin.slice;
    $.get(dbroot,{
		"action":"load_last",
		"origin":JSON.stringify(myOrigin),
		"key":key
	}).success(function(data) {
		var	i,obj,reg;
		annotationLoadingFlag = false;
        if( data.length == 0 )
            return;
		
		// if the slice that was just loaded does not correspond to the current slice,
		// do not display this one and load the current slice.
		if( slice != currentImage ) {
            microdrawDBLoad()
            .then(function() {
                $("#regionList").height($(window).height()-$("#regionList").offset().top);
                updateRegionList();
                paper.view.draw();
            });
            def.fail();
		    return;
		}
	
		// parse the data and add to the current canvas
		// console.log("[",data,"]");
        obj = JSON.parse(data);
		if( obj ) {
			obj = JSON.parse(obj.myValue);
			for( i = 0; i < obj.Regions.length; i++ ) {
				var reg = {};
				var	json;
				reg.name = obj.Regions[i].name;
				reg.page = obj.Regions[i].page;
				json = obj.Regions[i].path;
				reg.path = new paper.Path();
				reg.path.importJSON(json);
				newRegion({name:reg.name,path:reg.path});
			}
			paper.view.draw();
            // if image has no hash, save one
			ImageInfo[currentImage]["Hash"] = (obj.Hash ? obj.Hash : hash(JSON.stringify(ImageInfo[currentImage]["Regions"])).toString(16));
    
		}
		if( debug ) console.log("< microdrawDBLoad resolve success. Number of regions:", ImageInfo[currentImage]['Regions'].length);
		def.resolve();
	}).error(function(jqXHR, textStatus, errorThrown) {
        console.log("< microdrawDBLoad resolve ERROR: " + textStatus + " " + errorThrown);
		annotationLoadingFlag = false;
    });
    return def.promise();
}

function microdrawDBIP() {
/*
    Get my IP
*/
    if( debug ) console.log("> microdrawDBIP promise");

    $("#regionList").html("<br />Connecting to database...");
    return $.get(dbroot,{
        "action":"remote_address"
    }).success(function(data) {
        if( debug ) console.log("< microdrawDBIP resolve: success");
        $("#regionList").html("");
        myIP = data;
    }).error(function(jqXHR, textStatus, errorThrown) {
        console.log("< microdrawDBIP resolve: ERROR, " + textStatus + ", " + errorThrown);
        $("#regionList").html("<br />Error: Unable to connect to database.");
    });
}

function save() {
    if( debug ) console.log("> save");

    var i;
    var obj;
    var el;

    obj = {};
    obj.Regions = [];
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ )
    {
        el = {};
        el.path = ImageInfo[currentImage]["Regions"][i].path.exportJSON();
        el.name = ImageInfo[currentImage]["Regions"][i].name;
        obj.Regions.push(el);
    }
    localStorage.Microdraw = JSON.stringify(obj);

    if( debug ) console.log("+ saved regions:",ImageInfo[currentImage]["Regions"].length);
}

function load() {
    if( debug ) console.log("> load");

    var i,obj,reg;
    if( localStorage.Microdraw ) {
        console.log("Loading data from localStorage");
        obj = JSON.parse(localStorage.Microdraw);
        for( i = 0; i < obj.Regions.length; i++ ) {
            var reg = {};
            var json;
            reg.name = obj.Regions[i].name;
            json = obj.Regions[i].path;
            reg.path = new paper.Path();
            reg.path.importJSON(json);
            newRegion({name:reg.name,path:reg.path});
        }
        paper.view.draw();
    }
}


/***5
    Initialisation
*/

function loadImage(name) {
    if( debug ) console.log("> loadImage(" + name + ")");
    // save previous image for some (later) cleanup
    prevImage = currentImage;

    // set current image to new image
    currentImage = name;

    viewer.open(ImageInfo[currentImage]["source"]);
}

function loadNextImage() {
    if( debug ) console.log("> loadNextImage");
    var index = imageOrder.indexOf(currentImage);
    var nextIndex = (index + 1) % imageOrder.length;

    // update image slider
    update_slider_value(nextIndex);

    loadImage(imageOrder[nextIndex]);
}

function loadPreviousImage() {
    console.log("> loadPrevImage");
    var index = imageOrder.indexOf(currentImage);
    var previousIndex = ((index - 1 >= 0)? index - 1 : imageOrder.length - 1 );

    // update image slider
    update_slider_value(previousIndex);

    loadImage(imageOrder[previousIndex]);
}


function resizeAnnotationOverlay() {
    //if( debug ) console.log("> resizeAnnotationOverlay");

    var width = $("body").width();
    var height = $("body").height();
    $("canvas.overlay").width(width);
    $("canvas.overlay").height(height);
    paper.view.viewSize = [width,height];
}

function initAnnotationOverlay(data) {
    //if( debug ) console.log("> initAnnotationOverlay");
    
    // do not start loading a new annotation if a previous one is still being loaded
    if(annotationLoadingFlag==true) {
        return;
    }
    
    console.log("new overlay size" + viewer.world.getItemAt(0).getContentSize());

    /*
       Activate the paper.js project corresponding to this slice. If it does not yet
       exist, create a new canvas and associate it to the new project. Hide the previous
       slice if it exists.
    */

    // change myOrigin (for loading and saving)
    myOrigin.slice = currentImage;

    // hide previous slice
    if( prevImage && paper.projects[ImageInfo[prevImage]["projectID"]] ) {
        paper.projects[ImageInfo[prevImage]["projectID"]].activeLayer.visible = false;
        $(paper.projects[ImageInfo[prevImage]["projectID"]].view.element).hide();
    }

    // if this is the first time a slice is accessed, create its canvas, its project,
    // and load its regions from the database
    if( ImageInfo[currentImage]["projectID"] == undefined ) {

        // create canvas
        var canvas = $("<canvas class='overlay' id='" + currentImage + "'>");
        $("body").append(canvas);

        // create project
        paper.setup(canvas[0]);
        ImageInfo[currentImage]["projectID"] = paper.project.index;

        // load regions from database
        if( config.useDatabase ) {
            microdrawDBLoad()
            .then(function(){
                $("#regionList").height($(window).height() - $("#regionList").offset().top);
                updateRegionList();
                paper.view.draw();
            });
        }

        if( debug ) console.log('Set up new project, currentImage: ' + currentImage + ', ID: ' + ImageInfo[currentImage]["projectID"]);
    }

    // activate the current slice and make it visible
    paper.projects[ImageInfo[currentImage]["projectID"]].activate();
    paper.project.activeLayer.visible = true;
    $(paper.project.view.element).show();

    // resize the view to the correct size
    var width = $("body").width();
    var height = $("body").height();
    paper.view.viewSize = [width, height];
    paper.settings.handleSize = 10;
    updateRegionList();
    paper.view.draw();

    /* RT: commenting this line out solves the image size issues */
       // set size of the current overlay to match the size of the current image
       magicV = viewer.world.getItemAt(0).getContentSize().x / 100;

    transform();
}

function transform() {
    //if( debug ) console.log("> transform");

    var z = viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var sw = viewer.source.width;
    var bounds = viewer.viewport.getBounds(true);
    var x = magicV * bounds.x;
    var y = magicV * bounds.y;
    var w = magicV * bounds.width;
    var h = magicV * bounds.height;
    paper.view.setCenter(x + w / 2, y + h / 2);
    paper.view.zoom=(sw * z) / magicV;

	if(socket && IAmASlave==false)
		socket.send(JSON.stringify({type:"setBounds",bounds:bounds}));
}

function deparam() {
    if( debug ) console.log("> deparam");

    var search = location.search.substring(1);
    var result = search?JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}',
                     function(key, value) { return key===""?value:decodeURIComponent(value) }):{};
    if( debug ) console.log("url parametres:",result);

    return result;
}

function loginChanged() {
    if( debug ) console.log("> loginChanged");

    updateUser();

    // remove all annotations and paper projects from old user
    // TODO maybe save to db??
    paper.projects[ImageInfo[currentImage]["projectID"]].activeLayer.visible = false;
    $(paper.projects[ImageInfo[currentImage]["projectID"]].view.element).hide();
    for( var i = 0; i < imageOrder.length; i++ ){

        ImageInfo[imageOrder[i]]["Regions"] = [];
        if( ImageInfo[imageOrder[i]]["projectID"] != undefined ) {
            paper.projects[ImageInfo[imageOrder[i]]["projectID"]].clear();
            paper.projects[ImageInfo[imageOrder[i]]["projectID"]].remove();
            ImageInfo[imageOrder[i]]["projectID"] = undefined;
        }
        $("<canvas class='overlay' id='" + currentImage + "'>").remove();
    }
    
    //load new users data

    viewer.open(ImageInfo[currentImage]["source"]);
}

function updateUser() {
    if( debug ) console.log("> updateUser");

    if( MyLoginWidget.username )
        myOrigin.user = MyLoginWidget.username;
    else {
        var username = {};
        username.IP = myIP;
        username.hash = hash(navigator.userAgent).toString(16);
        myOrigin.user = username;
    }
}

function makeSVGInline() {
    if( debug ) console.log("> makeSVGInline promise");

    var def = $.Deferred();
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

            if( debug ) console.log("< makeSVGInline resolve: success");
            def.resolve();
        }, 'xml');
    });

    return def.promise();
}

function updateSliceName() {
    $("#slice-name").val(currentImage);
    var slash_index = params.source.lastIndexOf("/") + 1;
    var filename    = params.source.substr(slash_index);
    $("title").text("MicroDraw|" + filename + "|" + currentImage);
}

function initShortCutHandler() {
    $(document).keydown(function(e) {
        var key = [];
        if( e.ctrlKey ) key.push("^");
        if( e.altKey ) key.push("alt");
        if( e.shiftKey ) key.push("shift");
        if( e.metaKey ) key.push("cmd");
        key.push(String.fromCharCode(e.keyCode));
        key = key.join(" ");
        if( shortCuts[key] ) {
            var callback = shortCuts[key];
            callback();
            e.preventDefault();
        }
    });
}

function shortCutHandler(key,callback) {
    var key = isMac?key.mac:key.pc;
    var arr = key.split(" ");
    for( var i = 0; i < arr.length; i++ ) {
        if( arr[i].charAt(0) == "#" ) {
            arr[i] = String.fromCharCode(parseInt(arr[i].substring(1)));
        } else
        if( arr[i].length == 1 ) {
            arr[i] = arr[i].toUpperCase();
        }
    }
    key = arr.join(" ");  
    shortCuts[key] = callback;
}

function initSlider(min_val, max_val, step, default_value) {
/*
    Initializes a slider to easily change between slices
*/
    if( debug ) console.log("> initSlider promise");
    var slider = $("#slider");
    if( slider.length > 0 ) { // only if slider could be found
        slider.attr("min", min_val);
        slider.attr("max", max_val - 1);
        slider.attr("step", step);
        slider.val(default_value);

        slider.on("change", function() {
            slider_onchange(this.value);
        });

        slider.on("input", function() {
            slider_onchange(this.value);
        });
    }
}

function slider_onchange(newImageIndex) {
/*
    Called when the slider value is changed to load a new slice
*/
    if( debug ) console.log("> slider_onchange promise");
    var imageNumber = imageOrder[newImageIndex];
    loadImage(imageNumber);
}

function update_slider_value(newIndex) {
/*
    Used to update the slider value if the slice was changed by another control
*/
    if( debug ) console.log("> update_slider_value promise");
    var slider = $("#slider");
    if( slider.length > 0 ) { // only if slider could be found
        slider.val(newIndex);
    }
}

function find_slice_number(number_str) {
/*
    Searches for the given slice-number.
    If the number could be found its index will be returned. Otherwise -1
*/
    var number = parseInt(number_str); // number = NaN if cast to int failed!
    if( !isNaN(number) ) {
        for( i = 0; i < imageOrder.length; i++ )  {
                var slice_number = parseInt(imageOrder[i]);
                // Compare the int values because the string values might be different (e.g. "0001" != "1")
                if( number == slice_number ) {
                    return i;
                }
        }
    }

    return -1;
}

function slice_name_onenter(event) {
/*
    Eventhandler to open a specific slice by the enter key
*/
    if( debug ) console.log("> slice_name_onenter promise");
    if( event.keyCode == 13 ) { // enter key
        var slice_number = $(this).val();
        var index = find_slice_number(slice_number);
        if( index > -1 ) { // if slice number exists
            update_slider_value(index);
            loadImage(imageOrder[index]);
        }
    }
    event.preventDefault(); // prevent the default action (scroll / move caret)
}

function loadConfiguration() {
    var def = $.Deferred();
    // load general microdraw configuration
    $.getJSON("configuration.json", function(data) {
        config = data;
        
        drawingTools = ["select", "draw", "draw-polygon", "simplify", "addpoint",
                        "delpoint", "addregion", "delregion", "splitregion", "rotate",
                        "save", "copy", "paste", "delete"];
        if( config.drawingEnabled == false ) {
            // remove drawing tools from ui
            for( var i = 0; i < drawingTools.length; i++ ){
                $("#" + drawingTools[i]).remove();
            }

        }
        for( var i = 0; i < config.removeTools.length; i++ ) {
            $("#" + config.removeTools[i]).remove();
        }
        if( config.useDatabase == false ) {
            $("#save").remove();
        }
        def.resolve();
    });

    return def.promise();
}

function initMicrodraw() {
    if( debug ) console.log("> initMicrodraw promise");

    var def = $.Deferred();

    // Subscribe to login changes
    MyLoginWidget.subscribe(loginChanged);

    // Enable click on toolbar buttons
    $("img.button").click(toolSelection);
    
    // set annotation loading flag to false
    annotationLoadingFlag = false;
    
    // Initialize the control key handler and set shortcuts
    initShortCutHandler();
    shortCutHandler({pc:'^ z',mac:'cmd z'},cmdUndo);
    shortCutHandler({pc:'^ y',mac:'cmd y'},cmdRedo);
    if( config.drawingEnabled ) {
        shortCutHandler({pc:'^ x',mac:'cmd x'},function() { console.log("cut!")});
        shortCutHandler({pc:'^ v',mac:'cmd v'},cmdPaste);
        shortCutHandler({pc:'^ a',mac:'cmd a'},function() { console.log("select all!")});
        shortCutHandler({pc:'^ c',mac:'cmd c'},cmdCopy);
        shortCutHandler({pc:'#46',mac:'#8'},cmdDeleteSelected);  // delete key
    }
    shortCutHandler({pc:'#37',mac:'#37'},loadPreviousImage); // left-arrow key
    shortCutHandler({pc:'#39',mac:'#39'},loadNextImage);     // right-arrow key

    // Configure currently selected tool
    selectedTool = "zoom";
    selectTool();

	// decide between json (local) and jsonp (cross-origin)
	var ext = params.source.split(".");
	ext = ext[ext.length - 1];
	if( ext == "jsonp" ) {
		if( debug )
			console.log("Reading cross-origin jsonp file");
		$.ajax({
			type: 'GET',
			url: params.source+"?callback=?",
			jsonpCallback: 'f',
			dataType: 'jsonp',
			contentType: "application/json",
			success: function(obj){initMicrodraw2(obj);def.resolve()}
		});
	} else
	if( ext == "json" ) {
		if( debug )
			console.log("Reading local json file");
		$.ajax({
			type: 'GET',
			url: params.source,
			dataType: "json",
            contentType: "application/json",
			success: function(obj){initMicrodraw2(obj);def.resolve()}
		});
	}

    // Change current slice by typing in the slice number and pessing the enter key
    $("#slice-name").keyup(slice_name_onenter);

    // Show and hide menu
    if( config.hideToolbar ) {
        var mouse_position;
        var animating = false;
        $(document).mousemove(function (e) {
            if( animating ) {
                return;
            }
            mouse_position = e.clientX;
    
            if( mouse_position <= 100 ) {
                //SLIDE IN MENU
                animating = true;
                $('#menuBar').animate({
                    left: 0,
                    opacity: 1
                }, 200, function () {
                    animating = false;
                });
            } else if( mouse_position > 200 ) {
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
        resizeAnnotationOverlay();
    });

    appendRegionTagsFromOntology(Ontology);

    return def.promise();
}

function initMicrodraw2(obj) {
	if( debug ) console.log("json file:",obj);

	// for loading the bigbrain
	if( obj.tileCodeY ) {
		obj.tileSources = eval(obj.tileCodeY);
	}

	// set up the ImageInfo array and imageOrder array
    console.log(obj);
	for( var i = 0; i < obj.tileSources.length; i++ ) {
		// name is either the index of the tileSource or a named specified in the json file
		var name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
		imageOrder.push(name);
		ImageInfo[name] = {"source": obj.tileSources[i], "Regions": [], "projectID": undefined};
		// if getTileUrl is specified, we might need to eval it to get the function
		if( obj.tileSources[i].getTileUrl && typeof obj.tileSources[i].getTileUrl === 'string' ) {
			eval("ImageInfo[name]['source'].getTileUrl = " + obj.tileSources[i].getTileUrl);
		}
	}
	
	// init slider that can be used to change between slides
	initSlider(0, obj.tileSources.length, 1, Math.round(obj.tileSources.length / 2));
	currentImage = imageOrder[Math.floor(obj.tileSources.length / 2)];

	params.tileSources = obj.tileSources;
	viewer = OpenSeadragon({
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
		preserveViewport: true,
		animationTime:0,
		gestureSettingsMouse:{
			scrollToZoom: true,
			clickToZoom: false, 
			dblClickToZoom: false,
			pinchToZoom: false,
			flickEnabled: true,
			flickMinSpeed:1,
			flickMomentum:1
		}
	});

	// open the currentImage
	viewer.open(ImageInfo[currentImage]["source"]);

	// add the scalebar
	viewer.scalebar({
		type: OpenSeadragon.ScalebarType.MICROSCOPE,
		minWidth:'150px',
		pixelsPerMeter:obj.pixelsPerMeter,
		color:'black',
		fontColor:'black',
		backgroundColor:"rgba(255,255,255,0.5)",
		barThickness:4,
		location: OpenSeadragon.ScalebarLocation.TOP_RIGHT,
		xOffset:5,
		yOffset:5
	});

	// add handlers: update slice name, animation, page change, mouse actions
	viewer.addHandler('open',function(){
		initAnnotationOverlay();
		updateSliceName();
	});
	viewer.addHandler('animation-finish', function(event){
		transform();
	});
	viewer.addHandler("page", function (data) {
		console.log(data.page,params.tileSources[data.page]);
	});
	viewer.addViewerInputHook({hooks: [
		{tracker: 'viewer', handler: 'clickHandler', hookHandler: clickHandler},
		{tracker: 'viewer', handler: 'pressHandler', hookHandler: pressHandler},
		{tracker: 'viewer', handler: 'dragHandler', hookHandler: dragHandler},
		{tracker: 'viewer', handler: 'dragEndHandler', hookHandler: dragEndHandler}
	]});

	if( debug ) console.log("< initMicrodraw2 resolve: success");
}

function toggleMenu () {
    if( $('#menuBar').css('display') == 'none' ) {
        $('#menuBar').css('display', 'block');
        $('#menuButton').css('display', 'none');
    } 
    else {
        $('#menuBar').css('display', 'none');
        $('#menuButton').css('display', 'block');
    }
}

$(function() {
    $.when(
        loadConfiguration()
    ).then(function(){
        if( config.useDatabase ) {
            $.when(
                microdrawDBIP(),
                MyLoginWidget.init()
            ).then(function(){
                params = deparam();
                myOrigin.appName = "microdraw";
                myOrigin.slice = currentImage;
                myOrigin.source = params.source;
                updateUser();
            }).then(initMicrodraw);
        } else {
            params = deparam();
            initMicrodraw();
        }
    });
});

function createSocket(host) {
	var ws;
	if (window.WebSocket) {
		ws=new WebSocket(host);
	} else if (window.MozWebSocket) {
		ws=new MozWebSocket(host);
	}
	return ws;
};
function initSocketConnection() {
	// WS connection
	var host = "ws://" + window.location.host + ":8080/";

	try {
		socket = createSocket(host);
		
		socket.onopen = function(msg) {
			console.log("ws  open");
		};
		
		socket.onmessage = function(msg) {
			// Message: interaction message
			var	data=JSON.parse(msg.data);
			switch(data.type) {
				case "setBounds": {
					IAmASlave=true;
					var b=data.bounds;
					var rect=new OpenSeadragon.Rect(b.x+b.width,b.y,b.width,b.height);
					viewer.viewport.fitBounds(rect);
					break;
				}
			}
		};
		
		me.socket.onclose = function(msg) {
			console.log("ws close");
		};
	}
	catch (ex) {
		console.log("ERROR: unable to connect");
	}
}
initSocketConnection();

/*
    // Log microdraw
    //microdrawDBSave(JSON.stringify(myOrigin),"entered",null);

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
