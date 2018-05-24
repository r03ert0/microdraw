/* global Microdraw */
/* global paper */

var ToolRotateCanvas = {
  rotateCanvas : (function(){
    var rotation = 0
    var rebindscalebar = function(){
      OpenSeadragon.Scalebar.prototype.getScalebarLocation = (function() {
        var currentRotation = Microdraw.viewer.viewport.getRotation() / 90
        var effectiveRotation = (this.location - currentRotation) <= 0 ?
          (this.location - currentRotation + 4 ) :
          (this.location - currentRotation)
        var anchorPoint = effectiveRotation === 2 ?
          new OpenSeadragon.Point(1,0) :
          effectiveRotation === 3 ? 
            new OpenSeadragon.Point(1, 1 / this.viewer.source.aspectRatio) :
            effectiveRotation === 4 ?
              new OpenSeadragon.Point(0, 1 / this.viewer.source.aspectRatio) :
              effectiveRotation === 1 ?
                new OpenSeadragon.Point(0, 0) :
                (console.error('effectiveness rotation out of bound',`effectiveRotation ${effectiveRotation}`,`this.location ${this.location}`),null)


        if (this.location === OpenSeadragon.ScalebarLocation.TOP_LEFT) {
            var x = 0;
            var y = 0;
            if (this.stayInsideImage) {
                var pixel = this.viewer.viewport.pixelFromPoint(anchorPoint, true);
                if (!this.viewer.wrapHorizontal) {
                    x = Math.max(pixel.x, 0);
                }
                if (!this.viewer.wrapVertical) {
                    y = Math.max(pixel.y, 0);
                }
            }

            return new OpenSeadragon.Point(x + this.xOffset, y + this.yOffset);
        }
        if (this.location === OpenSeadragon.ScalebarLocation.TOP_RIGHT) {
            var barWidth = this.divElt.offsetWidth;
            var container = this.viewer.container;
            var x = container.offsetWidth - barWidth;
            var y = 0;
            if (this.stayInsideImage) {
                var pixel = this.viewer.viewport.pixelFromPoint( anchorPoint, true);
                if (!this.viewer.wrapHorizontal) {
                    x = Math.min(x, pixel.x - barWidth);
                }
                if (!this.viewer.wrapVertical) {
                    y = Math.max(y + 20, pixel.y);
                }
            }

            return new OpenSeadragon.Point(x - this.xOffset, y + this.yOffset);
        }
        if (this.location === OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT) {
            var barWidth = this.divElt.offsetWidth;
            var barHeight = this.divElt.offsetHeight;
            var container = this.viewer.container;
            var x = container.offsetWidth - barWidth;
            var y = container.offsetHeight - barHeight;
            if (this.stayInsideImage) {
                var pixel = this.viewer.viewport.pixelFromPoint(anchorPoint,true);
                if (!this.viewer.wrapHorizontal) {
                    x = Math.min(x, pixel.x - barWidth);
                }
                if (!this.viewer.wrapVertical) {
                    y = Math.min(y, pixel.y - barHeight);
                }
            }

            return new OpenSeadragon.Point(x - this.xOffset, y - this.yOffset);
        }
        if (this.location === OpenSeadragon.ScalebarLocation.BOTTOM_LEFT) {
            var barHeight = this.divElt.offsetHeight;
            var container = this.viewer.container;
            var x = 0;
            var y = container.offsetHeight - barHeight;
            if (this.stayInsideImage) {
                var pixel = this.viewer.viewport.pixelFromPoint(anchorPoint,true);
                if (!this.viewer.wrapHorizontal) {
                    x = Math.max(x, pixel.x);
                }
                if (!this.viewer.wrapVertical) {
                    y = Math.min(y, pixel.y - barHeight);
                }
            }

            return new OpenSeadragon.Point(x + this.xOffset, y - this.yOffset);
        }
        console.warn('none applies, uh oh',effectiveRotation,
          OpenSeadragon.ScalebarLocation.TOP_LEFT,
          OpenSeadragon.ScalebarLocation.TOP_RIGHT,
          OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT,
          OpenSeadragon.ScalebarLocation.BOTTOM_LEFT)
      }).bind(Microdraw.viewer.scalebarInstance);
    }
    var tool = {
      click : function click(prevTool) {
        console.log('this.location',Microdraw.viewer.scalebarInstance.location)
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
        
        rebindscalebar()

        Microdraw.backToPreviousTool()
        /* somehow this is needed ... to refresh the view? I don't quite understand */
          
      }
    }
    return tool;
  }())
};