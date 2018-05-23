/*global Microdraw*/
/*global paper*/

var ToolEraser = {
  eraser: (function(){

    var osdMTracker
    var paintBrushDefaultSize = 100;
    var paintBrushScale = 1.0;
    var paintBrushCircle 
    var eraserFlag = false

    var finishedErasing = function(){
      paintBrushCircle.setPosition(-10000,-10000)
      Microdraw.region.fullySelected = true
      Microdraw.commitMouseUndo()
      Microdraw.backToSelect()
    }

    var tool = {

      mouseUp : function mouseUp(){
        Microdraw.region.fullySelected = true
      },

      /**
       * @function mouseDown
       * @param {object} point The point where you clicked (x,y)
       * @returns {void}
       */
      mouseDown : function mouseDown(point) {
          
        /* eraser mouse down */

        /* if no region is selected, return to select */
        if( !Microdraw.region ){
          /* fire off warning here if necessary */
          if( Microdraw.showInfoModal ) Microdraw.showInfoModal('Please select an area that you wish you erase first, then select the erase tool.')
          else console.warn('Please select an area that you wish you erase first, then select the erase tool.')
          Microdraw.backToSelect()
          return
        }
      },
  
      /**
       * @function mouseDrag
       * @param {object} point The point where you moved to (x,y)
       * @param {object} dpoint The movement of the point
       * @return {void}
       */
      mouseDrag : function mouseDrag(point,dpoint) {
        
        if( dpoint.x !=0 || dpoint.y != 0){
          let newCircle = new paper.Path.Circle({
              center : point,
              radius : paintBrushDefaultSize*paintBrushScale
          })
          let tmp = Microdraw.region.path.subtract(newCircle)
          Microdraw.region.path.remove()
          Microdraw.region.path = tmp

          /* move the eraser indicator during mousedrag */
          paintBrushCircle.setPosition(point)
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
        eraserFlag = false
        paintBrushCircle.fillColor = new paper.Color(0,0,0,0)
        paintBrushCircle.setPosition(-10000,-10000)
        paper.view.draw()
      },

      /*
        * @function click
        * @desc Erases region as if with an eraser
        * @param {string} prevTool The previous tool to which the selection goes back
        * @returns {void}
        */
      click: function click(prevTool) {
        Microdraw.navEnabled = false;

        /* if no region is selected, return to select */
        if( !Microdraw.region ){
          /* fire off warning here if necessary */
          if( Microdraw.showInfoModal ) Microdraw.showInfoModal('Please select an area that you wish you erase first, then select the erase tool.')
          else console.warn('Please select an area that you wish you erase first, then select the erase tool.')
          Microdraw.backToSelect()
          return
        }

        eraserFlag = true

        if(typeof osdMTracker === 'undefined' || osdMTracker === null){
          
          paintBrushCircle = new paper.Path.Circle([0,0],paintBrushDefaultSize);

          paintBrushCircle.fillColor =  new paper.Color(1,0,0,0.5);

          osdMTracker = new OpenSeadragon.MouseTracker({
            element : Microdraw.viewer.container,
            moveHandler : function(event){
              if( !eraserFlag ){
                return
              }
              var point = paper.view.viewToProject( new paper.Point(event.originalEvent.layerX,event.originalEvent.layerY) )

              // console.log(webPoint,viewportPoint,imagePoint,event)
              paintBrushCircle.setPosition( point )
              paintBrushCircle.fillColor =  new paper.Color(0.5,0.1,0,0.5);
              
            }
          })
          osdMTracker.setTracking(true)
        }

      }
    }
    
    return tool
  }())
}