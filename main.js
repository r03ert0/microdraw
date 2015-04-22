// example ontology

var Ontology=[{name:"Telencephalon",parts:[
                    {name:"Neocortex"},
                    {name:"Rhinencephalon"},
                    {name:"Amygdala"},
                    {name:"Hippocampus"},
                    {name:"Basal Ganglia"}
                 ]},
                 {name:"Diencephalon",parts:[
                    {name:"Thalamus"},
                    {name:"Hypothalamus"},
                    {name:"Epithalamus"},
                    {name:"Subthalamus"},
                    {name:"Pituitary Gland"},
                    {name:"Pineal Gland"}
                 ]},
                 {name:"Mesencephalon",parts:[
                    {name:"Tectum"},
                    {name:"Pretectum"},
                    {name:"Cerebral Peduncle"}
                 ]},
                 {name:"Rhombencephalon",parts:[
                    {name:"Pons"},
                    {name:"Cerebellum"},
                    {name:"Medulla Oblongata"}
                ]}];

var Regions=[];     // main list of regions. Contains a paper.js path, a unique ID and a name;
var region=null;    // currently selected region (one element of Regions[])
var handle;         // currently selected control point or handle (if any)
var newRegionFlag;
var selectedTool="zoom";
var viewer;         // open seadragon viewer
var navEnabled=true;// flag indicating whether the navigator is enabled (if it's not, the annotation tools are)
var magicV=1000;    // resolution of the annotation canvas

var debug=false;

/*
    Region handling functions
*/
function newRegion(arg) {
    if(debug) console.log("> newRegion");
    
    var reg={};
    
    reg.uid=regionUniqueID();
    if(arg.name)
        reg.name=arg.name;
    else {
        reg.name="Untitled "+reg.uid;
    }
    var color=regionHashColor(reg.name);
    
    if(arg.path) {
        reg.path = arg.path;
        reg.path.strokeWidth=1;
        reg.path.strokeColor='black';
        reg.path.fillColor='rgba('+color.red+','+color.green+','+color.blue+',0.5)';
        reg.path.selected=false;
    }
    
    // append region tag to regionList
    var el=$(regionTag(reg.name,reg.uid));
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

    // push the new region to the Regions array
    Regions.push(reg);
    
    if(debug) console.log("< newRegion");
    return reg;
}
function removeRegion(reg) {
    if(debug) console.log("> removeRegion");
    
    // remove from Regions array
    Regions.splice(Regions.indexOf(reg),1);
    // remove from paths
    reg.path.remove();
    // remove from regionList
    var tag=$("#regionList > .region-tag#"+reg.uid);
    $(tag).remove();
}
function selectRegion(reg) {
    if(debug) console.log("> selectRegion");
    
    var i;

    // Select path
    for(i=0;i<Regions.length;i++) {
        if(Regions[i]==reg) {
            reg.path.selected=true;
            reg.path.fullySelected=true;
            region=reg;
        }
        else {
            Regions[i].selected=false;
            Regions[i].path.fullySelected=false;
        }
    }
    paper.view.draw();
    
    // Select region name in list
    $("#regionList > .region-tag").each(function(i){
        $(this).css({backgroundColor:"transparent"});
    });

    var tag=$("#regionList > .region-tag#"+reg.uid);
    $(tag).css("background-color","rgba(255,255,255,0.5)");
    
    if(debug) console.log("< selectRegion");
}
function findRegionByUID(uid) {
    if(debug) console.log("> findRegionByUID");
    
    var i;
    for(i=0;i<Regions.length;i++) {
        if(Regions[i].uid==uid) {
            return Regions[i];
        }
    }
    console.log("Region with unique ID "+uid+" not found");
    return null;
}
var counter=1;
function regionUniqueID() {
    if(debug) console.log("> regionUniqueID");
    
    var i;
    var found=false;
    while(found==false) {
        found=true;
        for(i=0;i<Regions.length;i++) {
            if(Regions[i].uid==counter) {
                counter++;
                found=false;
                break;
            }
        }
    }
    return counter;
}
function regionHashColor(name) {
    if(debug) console.log("> regionHashColor");
    
    var color={};
    var hash=name.split("").reduce(function(a,b){
        a=((a<<5)-a)+b.charCodeAt(0);return a&a
    },0);
    color.red=hash&0xff;
    color.green=(hash&0xff00)>>8;
    color.blue=(hash&0xff0000)>>16;
    return color;
}
function regionTag(name,uid) {
    if(debug) console.log("> regionTag");
    
    var color=regionHashColor(name);
    var str;
    if(uid)
        str=[   "<div class='region-tag' id='"+uid+"' style='padding:2px'>",
                "<div class='region-color'",
                "style='background-color:rgba(",
                color.red,",",color.green,",",color.blue,",0.67",
                ")'></div>",
                "<span class='region-name'>"+name+"</span>",
                "</div>",
                ].join(" ");
    else
        str=[   "<div class='region-tag' style='padding:2px'>",
                "<div class='region-color'",
                "style='background-color:rgba(",
                color.red,",",color.green,",",color.blue,",0.67",
                ")'></div>",
                "<span class='region-name'>"+name+"</span>",
                "</div>",
                ].join(" ");
    return str;
}
function appendRegionTagsFromOntology(o) {
    if(debug) console.log("> appendRegionTagsFromOntology");
    
    for(var i=0;i<o.length;i++) {
        if(o[i].parts) {
            $("#regionPicker").append("<div>"+o[i].name+"</div>");
            appendRegionTagsFromOntology(o[i].parts);
        }
        else {
            var tag=regionTag(o[i].name);
            var el=$(tag).addClass("ontology");
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
    if(debug) console.log("> regionPicker");
    
    $("div#regionPicker").appendTo($(parent));
    $("div#regionPicker").show();
}

function changeRegionName(reg,name) {
    if(debug) console.log("> changeRegionName");
    
    var i;
    var color=regionHashColor(name);

    // Update path
    reg.name=name;
    reg.path.fillColor='rgba('+color.red+','+color.green+','+color.blue+',0.5)';
    paper.view.draw();
    
    // Update region tag
    $(".region-tag#"+reg.uid+">.region-name").text(name);
    $(".region-tag#"+reg.uid+">.region-color").css('background-color','rgba('+color.red+','+color.green+','+color.blue+',0.67)');
}

/*
    Interaction: mouse and tap
*/
function clickHandler(event){
    if(debug) console.log("> clickHandler");
    event.stopHandlers=!navEnabled;
}
function pressHandler(event){
    if(debug) console.log("> pressHandler");
    if(!navEnabled) {
        event.stopHandlers = true;
        mouseDown(event.originalEvent.layerX,event.originalEvent.layerY);
    }
}
function dragHandler(event){
    if(debug) console.log("> dragHandler");
    var zoom =viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var z=magicV/viewer.source.width/zoom
    if(!navEnabled) {
        event.stopHandlers = true;
        mouseDrag(event.originalEvent.layerX,event.originalEvent.layerY);
    }
}
function dragEndHandler(event){
    if(debug) console.log("> dragEndHandler");
    if(!navEnabled) {
        event.stopHandlers = true;
        mouseUp();
    }
}
function singlePressOnRegion(event) {
    if(debug) console.log("> singlePressOnRegion");
    console.log("this",this,event);
    
    event.stopPropagation();
    event.preventDefault();

    var el=$(this);
    var uid;
    var reg;
    
    if(el.hasClass("ontology")) {
        var newName=el.find(".region-name").text();
        uid=$(this).parent().parent().attr('id');
        console.log("uid",uid);
        reg=findRegionByUID(uid);
        changeRegionName(reg,newName);
        $("div#regionPicker").appendTo($("body")).hide();
    }
    else {
        uid=$(this).attr('id');
        console.log("uid",uid);
        reg=findRegionByUID(uid);
        if(reg)
            selectRegion(reg);
        else
            console.log("region undefined");
    }
}
function doublePressOnRegion(event) {
    if(debug) console.log("> doublePressOnRegion");
    
    event.stopPropagation();
    event.preventDefault();

    regionPicker(this);
}
var tap=false
function handleRegionTap(event) {
/*
    Handles single and double tap in touch devices
*/
    if(debug) console.log("> handleRegionTap");
    var caller=this;
    console.log("this:",caller);
    
    if(!tap){ //if tap is not set, set up single tap
        tap=setTimeout(function(){
            tap=null
        },300);
        console.log("calling singlePressOnRegion");
        
        // call singlePressOnRegion(event) using 'this' as context
        singlePressOnRegion.call(this,event);
    } else {
        clearTimeout(tap);
        tap=null;
        
        // call doublePressOnRegion(event) using 'this' as context
        doublePressOnRegion.call(this,event);
    }
    if(debug) console.log("< handleRegionTap");
}
function mouseDown(x,y) {
    if(debug) console.log("> mouseDown");
    
    var zoom =viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var z=magicV/viewer.source.width/zoom
    var point=new paper.Point(x*z,y*z);
    var prevRegion=null;
    
    handle=null;

    switch(selectedTool) {
        case "select":
        case "addpoint":
        case "delpoint":
        case "addregion":
        case "delregion":
        case "splitregion":
            var hitResult=paper.project.hitTest(point, {
                    tolerance:4,
                    stroke: true,
                    segments:true,
                    fill: true,
                    handles:true
                });
            newRegionFlag=false;
            if (hitResult) {
                var i;
                for(i=0;i<Regions.length;i++) {
                    if(Regions[i].path==hitResult.item) {
                        re=Regions[i];
                        break;
                    }
                }

                // select path
                if(region && region!=re) {
                    region.path.selected=false;
                    prevRegion=region;
                }
                selectRegion(re);
                //re.path.fullySelected=true;
                //region=re;
        
                if (hitResult.type == 'handle-in') {
                    handle = hitResult.segment.handleIn;
                    handle.point=point;
                } else
                if (hitResult.type == 'handle-out') {
                    handle = hitResult.segment.handleOut;
                    handle.point=point;
                } else
                if (hitResult.type=='segment') {
                    if(selectedTool=="select") {
                        handle=hitResult.segment.point;
                        handle.point=point;
                    }
                    if(selectedTool=="delpoint")
                        hitResult.segment.remove();
                } else
                if (hitResult.type=='stroke' && selectedTool=="addpoint") {
                    region.path
                    .curves[hitResult.location.index]
                    .divide(hitResult.location);
                    region.path.fullySelected=true;
                    paper.view.draw();
                } else
                if (selectedTool=="addregion") {
                    if(prevRegion) {
                        var newPath=region.path.unite(prevRegion.path);
                        removeRegion(prevRegion);
                        region.path.remove();
                        region.path=newPath;
                    }
                } else
                if (selectedTool=="delregion") {
                    if(prevRegion) {
                        var newPath=prevRegion.path.subtract(region.path);
                        removeRegion(prevRegion);
                        prevRegion.path.remove();
                        newRegion({path:newPath});
                    }
                } else
                if (selectedTool=="splitregion") {
                    if(prevRegion) {
                        var newPath=region.path.divide(prevRegion.path);
                        removeRegion(prevRegion);
                        region.path.remove();
                        region.path=newPath;
                        for(i=0;i<newPath._children.length;i++)
                        {
                            if(i==0)
                                region.path=newPath._children[i];
                            else {
                                newRegion({path:newPath._children[i]});
                            }
                        }
                    }
                }
                break;
            }
            if(hitResult==null && region) {
                // deselect paths
                region.path.selected=false;
                region=null;
            }
            break;
        case "draw":
            // Start a new region
            // if there was an older region selected, unselect it
            if(region)
                region.path.selected = false;
            // start a new region
            region=newRegion({path:new paper.Path({segments:[point]})});
            // signal that a new region has been created for drawing
            newRegionFlag=true;
            break;
    }
    paper.view.draw();
}
function mouseDrag(x,y) {
    if(debug) console.log("> mouseDrag");
    var zoom =viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var z=magicV/viewer.source.width/zoom;
    var point=new paper.Point(x*z,y*z);
    if (handle) {
        handle.x+=point.x-handle.point.x;
        handle.y+=point.y-handle.point.y;
        handle.point=point;
    } else
    if(selectedTool=="draw") {
        region.path.add(point);
    }
    paper.view.draw();
}
function mouseUp() {
    if(debug) console.log("> mouseUp");
    if(newRegionFlag==true){
        region.path.simplify(10);
        region.path.closed=true;
        region.path.fullySelected = true;
    }
    paper.view.draw();
}

/*
    Tool selection
*/
function toolSelection(event) {
    if(debug) console.log("> toolSelection");
    
    var prevTool=selectedTool;
    selectedTool=$(this).attr("id");
    selectTool();
    
    switch(selectedTool) {
        case "select":
        case "addregion":
        case "delregion":
        case "addpoint":
        case "delpoint":
        case "draw":
            navEnabled=false;
            break;
        case "zoom":
            navEnabled=true;
            handle=null;
            break;
        case "delete":
            for(i in Regions) {
                if(Regions[i].path.selected) {
                    removeRegion(Regions[i]);
                    paper.view.draw();
                    break;
                }
            }
            // go back to previous tool
            setTimeout(function() {
            selectedTool=prevTool;
            selectTool()},500);
            break;
        case "save":
            save();
            break;
    }
}
function selectTool() {
    if(debug) console.log("> selectTool");
    
    $("button").removeClass("selected");
    $("button#"+selectedTool).addClass("selected");
}

/*
    Annotation storage
*/
function save() {
/*
    Save SVG overlay to localStorage
*/
    if(debug) console.log("> save");
    
    var i;
    var obj;
    var el;

    obj={};
    obj.Regions=[];
    for(i=0;i<Regions.length;i++)
    {
        el={};
        el.path=Regions[i].path.exportJSON();
        el.name=Regions[i].name;
        obj.Regions.push(el);
    }
    localStorage.Microdraw=JSON.stringify(obj);
    console.log("saved regions:",Regions.length);
}
function load() {
/*
    Load SVG overlay from localStorage
*/
    if(debug) console.log("> load");
    
    var i,obj,reg;
    if(localStorage.Microdraw) {
        console.log("Loading data from localStorage");
        obj=JSON.parse(localStorage.Microdraw);
        for(i=0;i<obj.Regions.length;i++) {
            var reg={};
            var json;
            reg.name=obj.Regions[i].name;
            json=obj.Regions[i].path;
            reg.path=new paper.Path();
            reg.path.importJSON(json);
            newRegion({name:reg.name,path:reg.path});
        }
        paper.view.draw();
    }
}

/*
    Initialisation
*/
function initAnnotationOverlay() {
    if(debug) console.log("> initAnnotationOverlay");
    
    // set up vectorial annotation overlay
    var zoom=viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var aspect=viewer.source.height/viewer.source.width;
    var width=magicV;
    var height=magicV*aspect;
    $("body").append("<canvas class='overlay'></canvas>");
    $("canvas.overlay").attr("width",width);
    $("canvas.overlay").attr("height",height);
    console.log("setup canvas");
    var canvas=$("canvas.overlay")[0];
    canvas.className="overlay";
    paper.setup(canvas);
    viewer.addOverlay({
        element:canvas,
        location: new OpenSeadragon.Rect(0,0,1,aspect)
    });
    
    // load SVG overlay from localStorage
    load();
}

function initMicrodraw() {
    if(debug) console.log("> initMicrodraw");
    
    $("button").click(toolSelection);

    viewer = OpenSeadragon({
        id: "openseadragon1",
        prefixUrl: "lib/openseadragon/images/",
        tileSources: "final/final.dzi",
        showNavigator: true,
        navigatorId:"myNavigator",
        zoomInButton:"zoom-in",
        zoomOutButton:"zoom-out",
        homeButton:"home"
    });
    viewer.scalebar({
        type: OpenSeadragon.ScalebarType.MICROSCOPE,
        minWidth:'150px',
        pixelsPerMeter:500000,
        color:'black',
        fontColor:'black',
        backgroundColor:"rgba(255,255,255,0.5)",
        barThickness:4,
        location: OpenSeadragon.ScalebarLocation.TOP_LEFT,
        xOffset:5,
        yOffset:5
    });
    viewer.addHandler('open',initAnnotationOverlay);

    viewer.addViewerInputHook({hooks: [
        {tracker: 'viewer', handler: 'clickHandler', hookHandler: clickHandler},
        {tracker: 'viewer', handler: 'pressHandler', hookHandler: pressHandler},
        {tracker: 'viewer', handler: 'dragHandler', hookHandler: dragHandler},
        {tracker: 'viewer', handler: 'dragEndHandler', hookHandler: dragEndHandler}
    ]});

    appendRegionTagsFromOntology(Ontology);
    selectTool();
}

initMicrodraw();

