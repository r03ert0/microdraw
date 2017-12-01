/*global Microdraw*/
/*global paper*/

var ToolDelete = { delete : (function(){
    var tool = {

        /* TODO: mouseDown of delete will never be called (?) */
        
        /**
         * @function mouseDown
         * @param {object} point The point where you clicked (x,y)
         * @returns {void}
         */
        mouseDown : function mouseDown(point) {
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
                var prevRegion
                if( Microdraw.region && Microdraw.region !== re ) {
                    Microdraw.region.path.selected = false;
                    prevRegion = Microdraw.region;
                }
                Microdraw.selectRegion(re);

                if( prevRegion ) {
                    var newPath = prevRegion.path.subtract(Microdraw.region.path);
                    Microdraw.removeRegion(prevRegion);
                    prevRegion.path.remove();
                    Microdraw.newRegion({path:newPath});
                    Microdraw.updateRegionList();
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
            Microdraw.cmdDeleteSelected();
            Microdraw.backToPreviousTool(prevTool);
        }
    }
})}