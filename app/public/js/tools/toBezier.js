/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */

var ToolToBezier = {toBezier: (function() {
  const tool = {

    /**
         * @function polygonToBezier
         * @desc converts polygon into bezier curve
         * @returns {void}
         */
    polygonToBezier: function polygonToBezier() {
      console.log("> polygonToBezier");
      if (Microdraw.region !== null) {
        if (Microdraw.region.path.hasHandles()) {
          return;
        }
        var undoInfo = Microdraw.getUndo();
        Microdraw.region.path.smooth();
        Microdraw.saveUndo(undoInfo);
        paper.view.draw();
      }
    },

    /*
         * @function click
         * @desc Convert polygon path to bezier curve
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    click: function click(prevTool) {
      tool.polygonToBezier();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
