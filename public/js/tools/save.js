/*global Microdraw*/
/*global paper*/

var ToolSave = { save : (function(){
    var tool = {

        /**
         * @function click
         * @desc save the annotations
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            Microdraw.microdrawDBSave();
            Microdraw.backToPreviousTool(prevTool);
        }
    }
    
    return tool;
}())}