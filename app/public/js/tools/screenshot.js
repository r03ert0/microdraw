/* eslint-disable no-unused-vars */
/* global Microdraw */
var ToolScreenshot = {screenshot: (function() {
  const tool = {

    /*
         * @function click
         * @desc Take a screenshot on click
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    click: function click(prevTool) {
      Microdraw.viewer.screenshotInstance.toggleScreenshotMenu();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
