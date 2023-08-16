/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */

const ToolPrevious = { previous : (function () {
  const tool = {

    /**
     * @function click
     * @desc previous. Previous image.
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      Microdraw.loadPreviousImage();
      Microdraw.backToPreviousTool(prevTool);
    }
  }
    
  return tool;
}())};
