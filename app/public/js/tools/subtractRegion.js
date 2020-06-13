/*global Microdraw*/
/*global paper*/

var ToolSubtractRegion = { subtractRegion : (function(){
    var tool = {

        /**
         * @function mouseDown
         * @param {object} point The point where you clicked (x,y)
         * @returns {void}
         */
        mouseDown : function mouseDown(point) {
            var prevRegion = null
            var hitResult = paper.project.hitTest(point, {
                tolerance : Microdraw.tolerance,
                stroke : true,
                segments : true,
                fill : true,
                handles : true
            })
            Microdraw.newRegionFlag = false;
            
            if( hitResult ) {
                var re = Microdraw.ImageInfo[Microdraw.currentImage].Regions.find(region=>region.path === hitResult.item)

                // select path
                if( Microdraw.region && Microdraw.region !== re ) {
                    Microdraw.region.path.selected = false;
                    prevRegion = Microdraw.region;
                }
                Microdraw.selectRegion(re);

                if( prevRegion ) {
                    var newPath = Microdraw.region.path.subtract(prevRegion.path);
                    Microdraw.removeRegion(prevRegion);
                    Microdraw.region.path.remove();
                    Microdraw.region.path = newPath;
                    // Microdraw.updateRegionList();
                    Microdraw.selectRegion(Microdraw.region);
                    paper.view.draw();
                    Microdraw.commitMouseUndo();
                    Microdraw.backToSelect();
                }
            } else {
                if( Microdraw.region ){
                    Microdraw.region.path.selected = false
                    Microdraw.region = null
                };
            };
            paper.view.draw();
        },

        /**
         * @function click
         * @desc add an additional point to the selected annotation
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            Microdraw.navEnabled = false;
            Microdraw.handle = null;
        }
    }
    
    return tool;
}())}