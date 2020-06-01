/*global Microdraw*/
/*global paper*/

var ToolSplitRegion = {splitRegion: (function() {
    var tool = {

        /**
         * @function mouseDown
         * @param {object} point The point where you click (x,y)
         * @returns {void}
         */
        mouseDown: function mouseDown(point) {
            var prevRegion = null;
            var hitResult = paper.project.hitTest(point, {
                    tolerance: Microdraw.tolerance,
                    stroke: true,
                    segments: true,
                    fill: true,
                    handles: true
                });
            Microdraw.newRegionFlag = false;
            if( hitResult ) {
                var i, re;
                for( i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
                    if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path === hitResult.item ) {
                        re = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
                        break;
                    }
                }

                // select path
                if( Microdraw.region && Microdraw.region != re ) {
                    Microdraw.region.path.selected = false;
                    prevRegion = Microdraw.region;
                }
                Microdraw.selectRegion(re);

                /*
                selected region is prevRegion
                region is the region that should be split based on prevRegion
                newRegionPath is outlining that part of region which has not been overlaid by prevRegion
                i.e. newRegion is what was region and prevRegion color should go to the other part
                */
                if( prevRegion ) {
                    var prevColor = prevRegion.path.fillColor;
                    var color = Microdraw.region.path.fillColor; // color of the overlaid part
                    var newPath = Microdraw.region.path.divide(prevRegion.path);
                    var newReg;

                    Microdraw.removeRegion(prevRegion);
                    Microdraw.region.path.remove();

                    Microdraw.region.path = newPath;
                    for( i = 0; i < newPath._children.length; i += 1 ) {
                        if( i == 0 ) {
                            Microdraw.region.path = newPath._children[i];
                        } else {
                            newReg = Microdraw.newRegion({path:newPath._children[i]});
                        }
                    }
                    Microdraw.region.path.fillColor = color;
                    if( newReg ) {
                        newReg.path.fillColor = prevColor;
                    }
                    // Microdraw.updateRegionList();
                    Microdraw.selectRegion(Microdraw.region);
                    paper.view.draw();

                    Microdraw.commitMouseUndo();
                    Microdraw.backToSelect();
                }
            }
        },

        /**
         * @function mouseUp
         * @returns {void}
         */
        mouseUp: function mouseUp() {
        },

        /*
         * @function click
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click: function click(prevTool) {
        }
    };

    return tool;
}())};
