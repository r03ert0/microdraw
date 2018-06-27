/*global Microdraw*/
/*global paper*/

var ToolRotate = { rotate : (function(){
    var tool = {

        /**
         * @function mouseDrag
         * @param {object} point The point where you moved to (x,y)
         * @param {object} dpoint The movement of the point
         * @return {void}
         */
        mouseDrag : function mouseDrag(point,dpoint) {
            event.stopHandlers = true;
            var degree = parseInt(dpoint.x, 10);
            for( i in Microdraw.ImageInfo[Microdraw.currentImage].Regions ) {
                if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.selected ) {
                    Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.rotate(degree, Microdraw.region.origin);
                    Microdraw.commitMouseUndo();
                }
            }
        },

        /**
         * @function mouseDown
         * @param {object} point The point where you clicked (x,y), will be the centre of rotation
         * @returns {void}
         */
        mouseDown : function mouseDown(point) {
            Microdraw.region.origin = point;
        },

        /**
         * @function click
         * @desc rotate the selected annotation
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