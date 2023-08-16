/* eslint-disable no-unused-vars */
/* eslint-disable max-statements */
/* global Microdraw */
/* global paper */

var ToolAddPoint = { addPoint : (function() {
  const _findRegion = function (item) {
    let re;
    for( let i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
      if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path === item ) {
        re = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
        break;
      }
    }

    return re;
  };

  var tool = {

    /**
     * @param {object} point The point where you clicked (x,y)
     * @returns {void}
     */
    mouseDown : function mouseDown(point) {
      var hitResult = paper.project.hitTest(point, {
        tolerance : Microdraw.tolerance/paper.view.zoom,
        stroke : true,
        segments : true,
        fill : true,
        handles : true
      });
      let prevRegion;
      Microdraw.newRegionFlag = false;

      if( hitResult ) {
        const re = _findRegion(hitResult.item);

        // select path
        if( Microdraw.region && Microdraw.region !== re ) {
          Microdraw.region.path.selected = false;
          prevRegion = Microdraw.region;
        }
        Microdraw.selectRegion(re);

        if( hitResult.type === 'stroke') {
          Microdraw.region.path
            .curves[hitResult.location.index]
            .divideAt(hitResult.location);
          Microdraw.region.path.fullySelected = true;
          Microdraw.commitMouseUndo();
        }
      } else if( Microdraw.region ) {
        Microdraw.region.path.selected = false;
        Microdraw.region = null;
      }
    },

    /**
     * @desc add an additional point to the selected annotation
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      Microdraw.navEnabled = false;
      Microdraw.handle = null;
    }
  };

  return tool;
}())};
