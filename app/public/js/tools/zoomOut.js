/*global Microdraw*/
/*global paper*/

var ToolZoomOut = { zoomOut : (function(){
    var tool = {

        /**
         * @function click
         * @desc zoomOut. Openseadragon initialisation parameter binds the function.
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            Microdraw.viewer.viewport.zoomBy(1/1.5);
            Microdraw.backToPreviousTool(prevTool);
        }
    }
    
    return tool;
}())}