/*global Microdraw*/
/*global paper*/

var ToolPaintbrush = {
  paintbrush: (function(){

    var osdMTracker
    var paintBrushPreview
    var paintBrushDefaultSize = 100
    var paintBrushCircle
    var paintBrushScale = 1.0
    var paintbrushFlag = false

    var tool = {

      /**
       * @function mouseDown
       * @param {object} point The point where you clicked (x,y)
       * @returns {void}
       */
      mouseDown : function mouseDown(point) {
          
        /* paint brush mouse down */

        if( Microdraw.region ){
          Microdraw.region.path.selected = false
          Microdraw.region.path.fullySelected = false
        }

        paintBrushCircle.setPosition(0,0)
        paintBrushCircle.fillColor = new paper.Color(0,0,0,0)

        paintBrushPreview = new paper.Path.Circle({
          center : point,
          radius : paintBrushDefaultSize*paintBrushScale, /* configurable */
        })

        Microdraw.region = Microdraw.newRegion({path:paintBrushPreview})
      },
      
      /**
       * @function mouseDrag
       * @param {object} point The point where you moved to (x,y)
       * @param {object} dpoint The movement of the point
       * @return {void}
       */
      mouseDrag : function mouseDrag(point,dpoint) {
        console.log('mousedrag')
        if(dpoint.x!=0||dpoint.y!=0){
          /* maybe use modifiers here? */
          let newCircle = new paper.Path.Circle({
            center : point,
            radius : paintBrushDefaultSize*paintBrushScale, 
          })
          let tmp = Microdraw.region.path.unite(newCircle)
          Microdraw.region.path.remove()
          Microdraw.region.path = tmp
          newCircle.remove()
        }
      },


      scrollHandler : function scrollHandler(event){

        /* accomodating for Chrome / FF */
        /* probably also need to debug for safari */
        if( event.shift ){
          let wheelDirection = event.originalEvent.wheelDelta || - event.originalEvent.deltaY
          if( wheelDirection > 0 && paintBrushScale < 5.0 ){
              /* scrolling up */
              paintBrushCircle.scale(1/paintBrushScale)
              paintBrushScale *= 1.1
              paintBrushCircle.scale(paintBrushScale)
          }else if( wheelDirection < 0 && paintBrushScale > 0.2 ){
              /* scrolling down */
              paintBrushCircle.scale(1/paintBrushScale)
              paintBrushScale *= 0.9
              paintBrushCircle.scale(paintBrushScale)
          }
  
          /* prevent default Openseadragon behaviour: zooming in/out */
          event.stopHandlers = true
  
          /* turns out, shift wheel is bound to navigate forward/backward on FF */
          event.originalEvent.preventDefault()
          event.originalEvent.stopPropagation()
        }
      },
      onDeselect : function onDeselect(){
        paintbrushFlag = false
        paintBrushCircle.fillColor = new paper.Color(0,0,0,0)
        paintBrushCircle.setPosition(-10000,-10000)
        paper.view.draw()
      },

      /*
        * @function click
        * @desc paints a region as if with a brush.
        * @param {string} prevTool The previous tool to which the selection goes back
        * @returns {void}
        */
       
      click: function click(prevTool) {
        Microdraw.navEnabled = false;
        paintbrushFlag = true

        paintBrushCircle = new paper.Path.Circle([0,0],paintBrushDefaultSize*paintBrushScale);
        paintBrushCircle.fillColor =  new paper.Color(0,0,1,0.5);

        /** only need to attach the mouse tracker once per instance of microdraw */
        if(typeof osdMTracker === 'undefined' || osdMTracker === null){

          
          osdMTracker = new OpenSeadragon.MouseTracker({
            element : Microdraw.viewer.container,
            moveHandler : function(event){
              if( !paintbrushFlag ){
                return
              }
              var point = paper.view.viewToProject( new paper.Point(event.originalEvent.layerX,event.originalEvent.layerY) )

              paintBrushCircle.setPosition( point )
              paintBrushCircle.fillColor =  new paper.Color(0.1,0.1,0.5,0.5);
              paper.view.draw();
            }
          })
          osdMTracker.setTracking(true)
        }
      }
    }
    return tool
  }())
}