/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */

const ToolSplitRegion = {splitRegion: (function() {
  const tool = {

    _findHitItem: function (point) {
      const hitResult = paper.project.hitTest(point, {
        tolerance : Microdraw.tolerance/paper.view.zoom,
        stroke: true,
        segments: true,
        fill: true,
        handles: true
      });
      if(!hitResult) {

        return;
      }
      let re;
      for( let i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
        if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path === hitResult.item ) {
          re = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
          break;
        }
      }

      return re;
    },

    _selectPathToSplit: function (item) {
      let prevRegion = null;
      if( Microdraw.region && Microdraw.region !== item ) {
        Microdraw.region.path.selected = false;
        prevRegion = Microdraw.region;
      }
      Microdraw.selectRegion(item);

      return prevRegion;
    },

    /**
     * Remove region from data structure and paperjs
     * @param {object} region Region to remove
     * @returns {void}
     */
    _removeRegion(region) {
      Microdraw.removeRegion(region);
      Microdraw.region.path.remove();
    },

    _addRegionsFromNewPath(newPath, prevColor) {
      newPath.remove();
      [Microdraw.region.path] = newPath._children;
      for( let i = 1; i < newPath._children.length; i += 1 ) {
        const newReg = Microdraw.newRegion({
          name: Microdraw.region.name,
          path: newPath._children[i]
        });
        newReg.path.fillColor = prevColor;
      }
      paper.project.activeLayer.addChildren(newPath._children);
    },

    _updateDisplay () {
      Microdraw.selectRegion(Microdraw.region);
      paper.view.draw();
    },

    _splitRegion (point) {
      const hitItem = tool._findHitItem(point);
      if(!hitItem) {

        return;
      }

      /* selected region is prevRegion region is the region that should be split based on prevRegion
      newRegionPath is outlining that part of region which has not been overlaid by prevRegion
      i.e. newRegion is what was region and prevRegion color should go to the other part */
      const prevRegion = tool._selectPathToSplit(hitItem);
      if(!prevRegion) {

        return;
      }

      const {fillColor: prevColor} = prevRegion.path;
      const newPath = Microdraw.region.path.divide(prevRegion.path);

      tool._removeRegion(prevRegion);
      tool._addRegionsFromNewPath(newPath, prevColor);
    },

    /**
     * @function mouseDown
     * @param {object} point The point where you click (x,y)
     * @returns {void}
     */
    mouseDown: function mouseDown(point) {
      Microdraw.newRegionFlag = false;
      tool._splitRegion(point);
      tool._updateDisplay();
      Microdraw.commitMouseUndo();
      Microdraw.backToSelect();
    },

    /**
         * @function mouseUp
         * @returns {void}
         */
    // eslint-disable-next-line no-empty-function
    mouseUp: function mouseUp() {
    },

    /*
         * @function click
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    // eslint-disable-next-line no-empty-function
    click: function click(prevTool) {
    }
  };

  return tool;
}())};
