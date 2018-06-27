/*global Microdraw*/
/*global paper*/

var ToolToPolygon = {toPolygon: (function() {
    var tool = {

        /**
         * @function bezierToPolygon
         * @desc Convert bezier curve into polygon path
         * @returns {void}
         */
        bezierToPolygon: function bezierToPolygon() {
            console.log("> bezierToPolygon");
            if (Microdraw.region !== null) {
                if (Microdraw.region.path.hasHandles()) {
                    if (confirm('Convert bezier curve into polygon?')) {
                        var undoInfo = Microdraw.getUndo();
                        Microdraw.region.path.clearHandles();
                        Microdraw.saveUndo(undoInfo);
                    }
                } else {
                    return;
                }
                paper.view.draw();
            }
        },

        /*
         * @function click
         * @desc Convert bezier curve into polygon path
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click: function click(prevTool) {
            tool.bezierToPolygon();
            Microdraw.backToPreviousTool(prevTool);
        }
    };

    return tool;
}())};
