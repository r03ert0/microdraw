/*global Microdraw*/
/*global paper*/

var ToolPaste = { paste : (function(){
    var tool = {

        /**
         * @function click
         * @desc paste. Paste selected annotation
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            Microdraw.cmdPaste();
            Microdraw.backToSelect();
        }
    }
    
    return tool;
}())}