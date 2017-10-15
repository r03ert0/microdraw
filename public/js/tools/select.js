/*global Microdraw*/
/*global paper*/


var ToolSelect = {select: (function() {
    var tool = {
        /**
         * @function selectRegion
         * @desc Make the region selected
         * @param {object} reg The region to select.
         * @this
         */
/*
        selectRegion: function selectRegion(reg) {
            var i;
            // Select path outline
            for( i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
                if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i] === reg ) {
                    reg.path.selected = true;
                    reg.path.fullySelected = true;
                    Microdraw.region = reg;
                } else {
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.selected = false;
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.fullySelected = false;
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

            if(Microdraw.debug) { console.log("< selectRegion"); }
        },
*/

        /**
         * @function mouseDown
         * @returns {void}
         */
        mouseDown: function mouseDown(point) {

/*
            Microdraw.mouseUndo = Microdraw.getUndo();
*/
            var prevRegion = null;
            var point = paper.view.viewToProject(new paper.Point(point));
            var hitResult;

            Microdraw.handle = null;

            hitResult = paper.project.hitTest(point, {
                tolerance: 3,
                stroke: true,
                segments: true,
                fill: true,
                handles: true
            });
            console.log(hitResult);

            var i = 0;
            var re;
            Microdraw.newRegionFlag === false;
            if( hitResult ) {
            console.log(hitResult.item);
                //var i, re;
                for( i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
                    console.log(Microdraw.ImageInfo[Microdraw.currentImage].Regions[0].path);
                    if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path === hitResult.item ) {
                        re = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
                    }
                }
            }

            // select path
            console.log(Microdraw.region);
            if( Microdraw.region && Microdraw.region != re ) {
                Microdraw.region.path.selected = false;
                prevRegion = Microdraw.region;
            }
            
            
            // Select path outline
            var reg;
            for( i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
                if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i] === re ) {
                    reg = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
                    reg.path.selected = true;
                    reg.path.fullySelected = true;
                    Microdraw.region = reg;
                } else {
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.selected = false;
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.fullySelected = false;
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

            
        




            if( hitResult.type == 'handle-in' ) {
                Microdraw.handle = hitResult.segment.handleIn;
                Microdraw.handle.point = point;
            } else if( hitResult.type == 'handle-out' ) {
                Microdraw.handle = hitResult.segment.handleOut;
                Microdraw.handle.point = point;
            } else if( hitResult.type == 'segment' ) {
                if( Microdraw.selectedTool == "select" ) {
                    Microdraw.handle = hitResult.segment.point;
                    Microdraw.handle.point = point;
                }
            }
            if( hitResult == null && Microdraw.region ) {
                //deselect paths
                Microdraw.region.path.selected = false;
                Microdraw.region = null;
            }
            paper.view.draw();
        },
        
        
        
        
        
        
        
        /**
         * @function selectRegion
         * @desc Make the region selected
         * @param {object} reg The region to select.
         * @this
         */
/*
        selectRegion: function selectRegion(reg) {
            console.log("> selectRegion");

            var i;

            // Select path
            for( i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
                if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i] === reg ) {
                    reg.path.selected = true;
                    reg.path.fullySelected = true;
                    Microdraw.region = reg;
                } else {
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.selected = false;
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.fullySelected = false;
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

            if(Microdraw.debug) { console.log("< selectRegion"); }
        },
*/

        /**
         * @function mouseDown
         * @returns {void}
         */
/*
         mouseDown: function mouseDown(point) {
            // Start a new region
            // if there was an older region selected, unselect it
            if( Microdraw.region ) {
                Microdraw.region.path.selected = false;
            }
            // start a new region
            var path = new paper.Path({segments:[point]});
            path.strokeWidth = Microdraw.config.defaultStrokeWidth;
            Microdraw.region = Microdraw.newRegion({path:path});
            // signal that a new region has been created for drawing
            Microdraw.newRegionFlag = true;

            Microdraw.commitMouseUndo();
        },
*/






        /*
         * @function click
         * @desc Convert polygon path to bezier curve
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click: function click(prevTool) {
            Microdraw.navEnabled = false;
            Microdraw.handle = null;
        },
    };
    return tool;
})()};
