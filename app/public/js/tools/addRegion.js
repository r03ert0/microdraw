/* eslint-disable no-plusplus */
/* eslint-disable max-statements */
/* global Microdraw */
/* global paper */

var ToolAddRegion = { addRegion : (function() {
  var tool = {
    _splitPath: (pathA, pathB) => {
      const arr = [new paper.Path()];
      for(let i=0; i<pathA.curves.length; i++) {
        const currentCurve = arr[arr.length - 1];
        const midpoint = pathA.curves[i].getPointAtTime(0.5);

        if(pathB.contains(midpoint)) {
          if(currentCurve.curves.length > 0) {
            arr.push(new paper.Path());
          }
        } else {
          if(currentCurve.curves.length === 0) {
            currentCurve.add(pathA.curves[i].getPointAtTime(0));
          }
          currentCurve.add(pathA.curves[i].getPointAtTime(1));
        }
      }

      return arr;
    },

    _equals: (pointA, pointB, tolerance) => {
      const dist = pointA.getDistance(pointB);

      return dist < tolerance;
    },

    _contiguous: (pathA, pathB) => {
      const a0b0 = tool._equals(pathA.firstCurve.getPoint1(), pathB.firstCurve.getPoint1(), 1e-6);
      const a1b0 = tool._equals(pathA.lastCurve.getPoint2(), pathB.firstCurve.getPoint1(), 1e-6);
      const a0b1 = tool._equals(pathA.firstCurve.getPoint1(), pathB.lastCurve.getPoint2(), 1e-6);
      const a1b1 = tool._equals(pathA.lastCurve.getPoint2(), pathB.lastCurve.getPoint2(), 1e-6);

      if( a0b0 || a1b0 || a0b1 || a1b1) {
        return true;
      }

      return false;
    },

    _uniteAllowSelfIntersection: (pathA, pathB) => {
      const tmpPathA = pathA.clone();
      const tmpPathB = pathB.clone();

      tmpPathA.reorient();
      tmpPathB.reorient();
      tmpPathA.remove();
      tmpPathB.remove();

      const intersections = tmpPathA.getIntersections(tmpPathB);

      for (let i = 0; i < intersections.length; i++) {
        const location1 = tmpPathA.getLocationOf(intersections[i].point);
        const location2 = tmpPathB.getLocationOf(intersections[i].point);
        tmpPathA.divideAt(location1);
        tmpPathB.divideAt(location2);
      }

      const arr = [
        ...tool._splitPath(tmpPathA, tmpPathB),
        ...tool._splitPath(tmpPathB, tmpPathA)
      ];

      let newPath;
      do {
        newPath = arr.pop();
      } while (newPath.length === 0);
      let changed = true;
      while(arr.length && changed === true) {
        changed = false;
        for(let i=0; i<arr.length; i++) {
          if(tool._contiguous(newPath, arr[i])) {
            newPath.join(arr[i], 1e-6);
            newPath.reorient();
            arr.splice(i, 1);
            changed = true;
            break;
          }
        }
      }
      newPath.fillColor = pathB.fillColor;
      newPath.strokeColor = pathB.strokeColor;
      newPath.strokeScaling = false;


      return newPath;
    },

    _findHitRegion: function (hitResult) {
      const hitRegion = Microdraw.ImageInfo[Microdraw.currentImage].Regions.find((region) => region.path === hitResult.item);

      return hitRegion;
    },

    _findPreviousRegion: function () {
      let prevRegion = null;

      if( Microdraw.region) {
        Microdraw.region.path.selected = false;
        prevRegion = Microdraw.region;
      }

      return prevRegion;
    },

    _configureNewRegion: function (prevRegion, newPath) {
      Microdraw.removeRegion(prevRegion);
      Microdraw.region.path.remove();
      Microdraw.region.path = newPath;
      Microdraw.selectRegion(Microdraw.region);
    },

    _configureNewRegion2: function (hitRegion, prevRegion, newPath) {
      Microdraw.selectRegion(hitRegion);
      Microdraw.region.path.remove();
      Microdraw.region.path = newPath;
      Microdraw.selectRegion(Microdraw.region);
      Microdraw.removeRegion(prevRegion);
    },

    _updateViewAndCommitUndo: function () {
      paper.view.draw();
      Microdraw.commitMouseUndo();
      Microdraw.backToSelect();
    },

    _unite: function (hitResult) {
      const hitRegion = tool._findHitRegion(hitResult);
      const prevRegion = tool._findPreviousRegion();

      if( !prevRegion || !hitRegion || hitRegion === prevRegion) {
        return;
      }

      // eslint-disable-next-line no-constant-condition
      if(true) {
        // select hitRegion
        Microdraw.selectRegion(hitRegion);

        // compute path resulting from the union of prevRegion and current region
        const newPath = hitRegion.path.unite(prevRegion.path);

        // replace prevRegion's path with new one
        tool._configureNewRegion(prevRegion, newPath);
      } else {
        const newPath = tool._uniteAllowSelfIntersection(hitRegion.path, prevRegion.path);
        tool._configureNewRegion2(hitRegion, prevRegion, newPath);
      }

      // update view and commit undo
      tool._updateViewAndCommitUndo();
    },

    /**
     * @param {object} point The point where you clicked (x,y)
     * @returns {void}
     */
    mouseDown : function (point) {
      const hitResult = paper.project.hitTest(point, {
        tolerance : Microdraw.tolerance/paper.view.zoom,
        stroke : true,
        segments : true,
        fill : true,
        handles : true
      });

      Microdraw.newRegionFlag = false;

      if( hitResult ) {
        tool._unite(hitResult);
      } else if( Microdraw.region ) {
        Microdraw.region.path.selected = false;
        Microdraw.region = null;
      }
      paper.view.draw();
    },

    /**
     * @desc add an additional point to the selected annotation
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    // eslint-disable-next-line no-unused-vars
    click : function click(prevTool) {
      Microdraw.navEnabled = false;
      Microdraw.handle = null;
    }
  };

  return tool;
}())};
