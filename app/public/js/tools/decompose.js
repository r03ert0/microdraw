/* eslint-disable no-unused-vars */
/* global Microdraw, paper */

/** Command to decompose a CompoundPath into independent paths.
 * The function can be called from the Web console, or from the
 * script window within Microdraw.
 * @param {number} sliceIndex Index of the current slice, where the
 * CompountPath is located.
 * @param {number} regionIndex Index of the region which contains the
 *  CompoundPath
 * @returns {void}
 */
const decompose = (sliceIndex, regionIndex) => {
  const orig = Microdraw.ImageInfo[sliceIndex].Regions[regionIndex];
  orig.path.remove();
  orig.path.children.forEach((r) => {
    Microdraw.newRegion({name: orig.name, path: r});
  });
  paper.project.activeLayer.addChildren(orig.path.children);
  Microdraw.removeRegion(orig);
};
