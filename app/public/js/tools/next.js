/*global Microdraw*/
/*global paper*/

var ToolNext = { next : (function(){
    var tool = {

        /**
         * @function click
         * @desc next. Next image.
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            Microdraw.loadNextImage();
            Microdraw.backToPreviousTool(prevTool);
        }
    }
    
    return tool;
}())}