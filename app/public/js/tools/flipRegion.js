/*global Microdraw*/
/*global paper*/

var ToolFlipRegion = {flipRegion: (function() {
  var tool = {

    /**
     * @function flipRegion
     * @desc Flip region along y-axis around its center point
     * @returns {void}
     */
    flip: function flip() {
      if( Microdraw.region !== null ) {
        if( Microdraw.debug ) { console.log("> flipping region"); }

        var i;
        for( i in Microdraw.ImageInfo[Microdraw.currentImage].Regions ) {
          if( Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.selected ) {
            Microdraw.ImageInfo[Microdraw.currentImage].Regions[i].path.scale(-1, 1);
          }
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
      tool.flip();
      Microdraw.backToPreviousTool(prevTool);
    }
  };

  return tool;
}())};
