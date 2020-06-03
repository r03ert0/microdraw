/*global Microdraw*/
/*global paper*/

var ToolHome = { home : (function() {
  var tool = {

    /**
     * @function click
     * @desc home. Openseadragon initialisation parameter binds the function.
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      Microdraw.viewer.viewport.goHome();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
