/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */

var ToolCopy = { copy : (function() {
  var tool = {

    /**
     * @desc copy. Copy selected annotation
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      Microdraw.cmdCopy();
      Microdraw.backToSelect();
    }
  };

  return tool;
}())};
