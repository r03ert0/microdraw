/* global Microdraw */
/* global paper */

var ToolRotateCanvas = {
  rotateCanvas : (function(){
    var rotation = 0
    var tool = {
      click : function click(prevTool) {
        Microdraw.navEnabled = true

        /* rotate openseadragon viewer */
        const r = Microdraw.viewer.viewport.getRotation()
        
        Microdraw.viewer.viewport.setRotation( r >= 270 ? 0 : (r + 90) )

        /* rotate all the annotations */
        // const canvas = paper.view._element
        paper.view._matrix.rotate(r >= 270 ? -270 : 90)

        /* if not, bugs where unless user pan, the annotations will not be flipped */
        const center = paper.view.center
        Microdraw.viewer.viewport.zoomBy(0.99999999,center,false)
        // Microdraw.viewer.viewport.goHome()
        
        Microdraw.backToPreviousTool()
        /* somehow this is needed ... to refresh the view? I don't quite understand */
          
      }
    }
    return tool;
  }())
};