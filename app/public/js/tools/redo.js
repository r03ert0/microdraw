/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */


var ToolRedo = {redo: (function() {
  const tool = {

    /**
         * @function redo
         * @desc Command to perform a redo by button click.
         * @returns {void}
         */
    redo: function redo() {
      if( Microdraw.RedoStack.length > 0 ) {
        var undoInfo = Microdraw.getUndo();
        var redoInfo = Microdraw.RedoStack.pop();
        Microdraw.applyUndo(redoInfo);
        Microdraw.UndoStack.push(undoInfo);
        paper.view.draw();
      }
    },

    /**
         * @function click
         * @desc Perform a redo
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    click: function click(prevTool) {
      tool.redo();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
