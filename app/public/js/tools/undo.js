/*global Microdraw*/
/*global paper*/


var ToolUndo = {undo: (function() {
    var tool = {

        /**
         * @function undo
         * @desc Command to perform an undo by button click.
         * @returns {void}
         */
        undo: function undo() {
            if( Microdraw.UndoStack.length > 0 ) {
                var redoInfo = Microdraw.getUndo();
                var undoInfo = Microdraw.UndoStack.pop();
                Microdraw.applyUndo(undoInfo);
                Microdraw.RedoStack.push(redoInfo);
                paper.view.draw();
            }
        },

        /**
         * @function click
         * @desc Perform an undo
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click: function click(prevTool) {
            tool.undo();
            Microdraw.backToPreviousTool(prevTool);
        }
    };

    return tool;
}())};
