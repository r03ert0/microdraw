/*global Microdraw*/
/*global paper*/

var ToolDrawPolygon = {drawPolygon: (function() {

  /* can be changed/loaded via config  */
  let drawingPolygonFlag = false;

  /**
   * @function finishDrawingPolygon
   * @description cleanup finishing drawing polygon
   * @param {bool} closed True if the polygon has to be closed
   * @returns {void}
   */
  function finishDrawingPolygon(closed) {

    // finished the drawing of the polygon
    if( closed ) {
      Microdraw.region.path.closed = true;
      Microdraw.region.path.fillColor.alpha = Microdraw.config.defaultFillAlpha;
    } else {
      Microdraw.region.path.fillColor.alpha = 0;
    }
    Microdraw.region.path.fullySelected = true;
    drawingPolygonFlag = false;
  }

  var tool = {

    /**
     * @function onDeselect
     * @description Function called when the tool is deselected
     * @returns {void}
     */
    onDeselect: function onDeselect() {
      // test if user is changing tool without closing the polygon.
      // If yes, close the polygon
      if( drawingPolygonFlag === true ) {
        finishDrawingPolygon(true);
      }
    },

    /**
     * @function mouseDown
     * @param {object} point The point where you click (x,y)
     * @returns {void}
     */
    mouseDown: function mouseDown(point) {
      // mouseUndo.callback is expected to be a function
      Microdraw.mouseUndo.callback = ((currentFlag) => () => {
        drawingPolygonFlag = currentFlag;
      })(drawingPolygonFlag);

      // is already drawing a polygon or not?
      if( drawingPolygonFlag === false ) {

        // deselect previously selected region
        if( Microdraw.region ) { Microdraw.region.path.selected = false; }

        // Start a new Region with alpha 0
        const path = new paper.Path({segments:[point]});
        path.strokeWidth = Microdraw.config.defaultStrokeWidth;
        Microdraw.region = Microdraw.newRegion({path:path});
        Microdraw.region.path.fillColor.alpha = 0;
        Microdraw.region.path.selected = true;

        drawingPolygonFlag = true;

      } else {
        // test if user is closing the polygon
        const hitResult = paper.project.hitTest(point, {tolerance:Microdraw.tolerance, segments:true});
        if( hitResult
                    && hitResult.item === Microdraw.region.path
                    && hitResult.segment.point === Microdraw.region.path.segments[0].point ) {
          // clicked on first point of current path
          // --> close path and remove drawing flag
          finishDrawingPolygon(true);
        } else {
          // add point to region
          Microdraw.region.path.add(point);
        }
      }

      Microdraw.commitMouseUndo();
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
        const origSegments = Microdraw.region.path.segments.length;

        // pixels per dot (dot is a device-independent psuedo-pixel with a
        // resolution of roughly 72 dpi)
        const ppd = paper.view.pixelRatio;

        // mouse selection accuracy in pixels: about 4 dots, that is 4 ppd pixels
        const pixelSelectAccuracy = 4.0*ppd;

        // ratio between project coordinates and browser pixels
        const coordsPerPixel = paper.view.size.width/paper.view.viewSize.width;

        // accuracy by which curves can reasonably be simplified
        const simplifyAccuracy = coordsPerPixel * pixelSelectAccuracy;

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
