(function() {
    $.getJSON("configuration.json", function(config) {
        drawingTools = ["select", "draw", "draw-polygon", "simplify", "addpoint", "delpoint", "addregion", "delregion", "splitregion", "rotate", "save", "copy", "paste", "delete"]
        if (config.drawingEnabled == false) {
            // remove drawing tools from ui
            for (var i = 0; i < drawingTools.length; i++){
                $("#" + drawingTools[i]).remove();
            }

        }
        for (var i = 0; i < config.removeTools.length; i++) {
            $("#" + config.removeTools[i]).remove();
        }
        
    });
})();
