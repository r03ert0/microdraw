/*global Microdraw*/
/*global paper*/

var ToolDrawPolygon = {drawPolygon: (function() {
    
    /* can be changed/loaded via config  */
    let drawingPolygonFlag = true

    /**
     * @function finishDrawingPolygon
     * @description cleanup finishing drawing polygon
     */
    const finishDrawingPolygon = function(closed){

        // finished the drawing of the polygon
        if( closed ) {
            Microdraw.region.path.closed = true;
            Microdraw.region.path.fillColor.alpha = Microdraw.config.defaultFillAlpha;
        } else {
            Microdraw.region.path.fillColor.alpha = 0;
        }
        Microdraw.region.path.fullySelected = true;
        drawingPolygonFlag = false
        Microdraw.commitMouseUndo();
    }

    var tool = {


        /**
         * @function mouseDown
         * @param {object} point The point where you click (x,y)
         * @returns {void}
         */
         mouseDown: function mouseDown(point) {
            // is already drawing a polygon or not?
            if( drawingPolygonFlag === false ) {
                // deselect previously selected region
                if( Microdraw.region ) { Microdraw.region.path.selected = false; }

                // Start a new Region with alpha 0
                var path = new paper.Path({segments:[point]});
                path.strokeWidth = Microdraw.config.defaultStrokeWidth;
                Microdraw.region = Microdraw.newRegion({path:path});
                Microdraw.region.path.fillColor.alpha = 0;
                Microdraw.region.path.selected = true;

                drawingPolygonFlag = true;

            } else {
                var hitResult = paper.project.hitTest(point, {tolerance:Microdraw.tolerance, segments:true});
                if( hitResult && hitResult.item === Microdraw.region.path && hitResult.segment.point === Microdraw.region.path.segments[0].point ) {
                    // clicked on first point of current path
                    // --> close path and remove drawing flag
                    finishDrawingPolygon(true);
                } else {
                    // add point to region
                    Microdraw.region.path.add(point);
                }
            }
        },

        /**
         * @function mouseUp
         * @returns {void}
         */
        mouseUp: function mouseUp() {
            if( Microdraw.newRegionFlag === true ) {
                Microdraw.region.path.closed = true;
                Microdraw.region.path.fullySelected = true;
                // to delete all unnecessary segments while preserving the form of the
                // region to make it modifiable; & adding handles to the segments
                var origSegments = Microdraw.region.path.segments.length;

                // delete unnecessary segments while preserving the shape of the region to
                // make it modifiable and & adding handles to the segments
                if (Microdraw.debug) {
                    origSegments = Microdraw.region.path.segments.length;
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
                Microdraw.region.path.simplify(simplifyAccuracy*simplifyAccuracy);

                if (Microdraw.debug) {
                    var finalSegments = Microdraw.region.path.segments.length;
                    console.log( finalSegments, parseInt(finalSegments/origSegments*100, 10) + "% segments conserved" );
                }
            }
            paper.view.draw();
        },

        /**
         * @function onDeselect
         * @returns {void}
         * @description called when user clicks another tool
         */
        onDeselect : function onDeselect(){
            finishDrawingPolygon(true)
        },

        /*
         * @function click
         * @desc Convert polygon path to bezier curve
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click: function click(prevTool) {
            Microdraw.navEnabled = false;
        }
    };

    return tool;
}())};
