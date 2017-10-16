/*global Microdraw*/
/*global paper*/

var ToolDrawLine = {
  drawLine: (function () {
    var tool = {
      /**
       * @function mouseDown
       * @returns {void}
       */
      mouseDown: function mouseDown(point) {
        if (Microdraw.region) {
          Microdraw.region.path.selected = false;
        }
        var path = new paper.Path({ segments: [point] });
        path.strokeWidth = Microdraw.config.defaultStrokeWidth;
        Microdraw.region = Microdraw.newRegion({ path: path });
        Microdraw.region.path.fillColor.alpha = 0;
        Microdraw.newRegionFlag = true;
        Microdraw.commitMouseUndo();
        return;
      },
      /**
       * @function mouseUp
       * @returns {void}
       */
      mouseUp: function mouseUp() {
        // this handler may get called for multiple times in one drawing session
        if (!Microdraw.region) return;

        if ((Microdraw.region.path.segments || []).length < Microdraw.tolerance) {
          Microdraw.removeRegion(Microdraw.region);
          paper.view.draw();
          return;
        }
        if (Microdraw.newRegionFlag === true) {
          Microdraw.region.path.closed = false;
          Microdraw.region.path.fullySelected = false;
        }
        paper.view.draw();

        // forget last region
        Microdraw.region = null;
      },
      /*
       * @function click
       * @desc Convert polygon path to bezier curve
       * @param {string} prevTool The previous tool to which the selection goes back
       * @returns {void}
       */
      click: function click(prevTool) {
        Microdraw.navEnabled = false;
      },
    };
    return tool;
  })()
};
