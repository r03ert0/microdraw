/*global Microdraw*/
/*global paper*/

var ToolFullscreen = { fullscreen : (function() {
  var tool = {
    _prevStyle: {},

    _configureParentElement: () => {
      if(document.querySelector("#microdraw")) {
        tool._parentElement = document.querySelector("#microdraw");
      } else {
        tool._parentElement = document.querySelector("#content");
      }
    },

    _enterFullscreen: () => {
      tool._prevStyle.height = tool._parentElement.style.height;

      tool._parentElement.style.position = "fixed";
      tool._parentElement.style.top = 0;
      tool._parentElement.style.left = 0;
      tool._parentElement.style.zIndex = 16;
      tool._parentElement.style.height = "100%";
    },

    _exitFullscreen: () => {
      tool._parentElement.style.position = "";
      tool._parentElement.style.top = "";
      tool._parentElement.style.left = "";
      tool._parentElement.style.zIndex = "";
      tool._parentElement.style.height = tool._prevStyle.height;
    },

    /**
     * @function click
     * @desc Toggle the full screen
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      tool._configureParentElement();
      const isFullscreen = tool._parentElement.style.position === "fixed";
      if(isFullscreen) {
        tool._exitFullscreen();
      } else {
        tool._enterFullscreen();
      }
      Microdraw.resizeAnnotationOverlay();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
