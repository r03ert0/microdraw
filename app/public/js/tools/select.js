/*global Microdraw*/
/*global paper*/


var ToolSelect = {select: (function() {
  var tool = {

    /**
         * @function mouseDrag
         * @param {object} point The point where you moved to (x,y)
         * @param {object} dpoint The movement of the point
         * @return {void}
        */
    mouseDrag: function mouseDrag(point, dpoint) {
      // event.stopHandlers = true;
      for( var reg of Microdraw.ImageInfo[Microdraw.currentImage].Regions ) {
        if( reg.path.selected ) {
          reg.path.position.x += dpoint.x;
          reg.path.position.y += dpoint.y;
          Microdraw.commitMouseUndo();
        }
      }
    },

    _handleHitResultType: function (hitResult, point) {
      if( hitResult.type === 'handle-in' ) {
        Microdraw.handle = hitResult.segment.handleIn;
        Microdraw.handle.point = point;
      } else if( hitResult.type === 'handle-out' ) {
        Microdraw.handle = hitResult.segment.handleOut;
        Microdraw.handle.point = point;
      } else if( hitResult.type === 'segment' ) {
        Microdraw.handle = hitResult.segment.point;
        Microdraw.handle.point = point;
      }
    },

    _handleHit: function (hitResult, point) {
      let prevRegion = null;
      let re;

      for( let i = 0; i < Microdraw.ImageInfo[Microdraw.currentImage].Regions.length; i += 1 ) {
        if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path === hitResult.item ) {
          re = Microdraw.ImageInfo[Microdraw.currentImage].Regions[i];
        }
      }

      // select path
      if( Microdraw.region && Microdraw.region !== re ) {
        Microdraw.region.path.selected = false;
        prevRegion = Microdraw.region;
      }
      Microdraw.selectRegion(re);

      tool._handleHitResultType(hitResult, point);
    },

    /**
     * @function mouseDown
     * @param {object} point The point where you click (x,y)
     * @returns {void}
     */
    mouseDown: function mouseDown(point) {
      Microdraw.mouseUndo = Microdraw.getUndo();
      Microdraw.handle = null;

      const hitResult = paper.project.hitTest(point, {
        tolerance : Microdraw.tolerance/paper.view.zoom,
        stroke: true,
        segments: true,
        fill: true,
        handles: true
      });

      Microdraw.newRegionFlag = false;
      if( hitResult ) {
        tool._handleHit(hitResult, point);
      }

      if( hitResult === null && Microdraw.region ) {
        //deselect paths
        Microdraw.region.path.selected = false;
        Microdraw.region = null;
      }


      paper.view.draw();
    },


    /*
         * @function click
         * @desc Convert polygon path to bezier curve
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
    click: function click(prevTool) {
      Microdraw.navEnabled = false;
      Microdraw.handle = null;
    }
  };

  return tool;
}())};
