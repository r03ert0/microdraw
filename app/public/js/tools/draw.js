/*global Microdraw*/
/*global paper*/

var ToolDraw = { draw: (function () {
  var tool = {

    /**
         * @function checkRegionSize
         * @param {object} reg The selected region
         * @returns {void}
         */
    checkRegionSize: function checkRegionSize(reg) {
      if( reg.path.segments.length <= 3 ) {
        Microdraw.removeRegion(Microdraw.region, Microdraw.currentImage);
      }
    },

    /**
         * @function mouseDown
         * @param {object} point The point where you click (x,y)
         * @returns {void}
         */
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

    /**
         * @function mouseDrag
         * @param {object} point The point where you moved to (x,y)
         * @param {object} dpoint The movement of the point
         * @return {void}
        */
    mouseDrag: function mouseDrag(point, dpoint) {
      Microdraw.region.path.add(point);
    },

    /**
         * @function mouseUp
         * @returns {void}
         */
    // eslint-disable-next-line max-statements
    mouseUp: function mouseUp() {
      if( Microdraw.newRegionFlag === true ) {
        Microdraw.region.path.closed = true;
        Microdraw.region.path.fullySelected = true;
        Microdraw.newRegionFlag = false;

        // to delete all unnecessary segments while preserving the form of the
        // region to make it modifiable; & adding handles to the segments
        var origSegments = Microdraw.region.path.segments.length;

        // delete unnecessary segments while preserving the shape of the region to
        // make it modifiable and & adding handles to the segments
        if (Microdraw.debug) {
          origSegments = Microdraw.region.path.segments.length;
        }

        // pixels per dot (dot is a device-independent psuedo-pixel with a resolution of roughly 72 dpi)
        const ppd = paper.view.pixelRatio;

        // mouse selection accuracy in pixels: about 4 dots, that is 4 ppd pixels
        const pixelSelectAccuracy = 4.0*ppd;

        // ratio between project coordinates and browser pixels
        const coordsPerPixel = paper.view.size.width/paper.view.viewSize.width;

        // accuracy by which curves can reasonably be simplified
        const simplifyAccuracy = coordsPerPixel*pixelSelectAccuracy;

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
