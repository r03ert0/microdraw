# MicroDraw Doc

### A multiscale, collaborative, vectorial annotation tool for ultra high resolution data
MicroDraw is a Web application to visualise and collaboratively annotate multi-resolution data by drawing vectorial regions. Regions can be labelled using ontologies such as <span style="font-weight:300">[NeuroLex](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3757470)</span> (currently disabled but will be back asap). MicroDraw should allow users to annotate any source of DeepZoom images on the Web: the multi-resolution image is kept at the data provider, and only the annotations are saved in MicroDraw's database. Boolean operations of these vectorial annotations allow to combine, subtract and split regions. A list of all tools can be found below.

MicroDraw is based on two main libraries: [OpenSeadragon.js](https://openseadragon.github.io) for multi-resolution data display, and [Paper.js](http://paperjs.org) for vectorial annotation.

### Annotation tools
MicroDraw has a rich set of annotation tools.  

<!-- ![toolset](/img/microdraw_toolset.png =200x170) -->
![](/img/empty.svg =17x17) ![#toolset](/img/toolset.png =250x210)

![](/img/fullscreen.svg =15x15) Fullscreen: Toggle fullscreen mode.

![](/img/chat.svg =17x17) Chat: Talk with other connected users.

![](/img/scroll.svg =17x17) Script console.

![](/img/home.svg =17x17) Home resets the image zoom and translation to fit the app window.

![](/img/zoomIn.svg =17x17) Zoom into the image conserving the centre point.

![](/img/zoomOut.svg =17x17) Zoom out of the image conserving the centre point.

![](/img/navigate.svg =17x17) Navigation: Click and drag to translate the image, click on a point to zoom in on it,  
shift-click to zoom out. On a tablet, translation and zooming can be done using pinching.

![](/img/select.svg =17x17) Selection: Click on a region to select it. This deselects any other previously selected
region. Clicking on a part of the image where there is no region drawn, deselects all regions.  

![](/img/draw.svg =17x17) Draw Bézier curves: Click and drag to draw the vectorial path that defines a region. All regions are closed and given a random name and colour. The path will be a Bézier curve with anchor points and handles to adjust the line and its curvature.

![](/img/drawPolygon.svg =17x17) Draw polygon: Click to draw points of a polygon contour. The vectorial path will be closed when clicking back into the first point to creat a region. Regions are closed and given a random name and colour.

![](/img/drawLine.svg =17x17) Draw a line: Click and drag to draw the vectorial path that defines a line, for example separating 2 cytoarchitectonic regions.

![](/img/addPoint.svg =17x17) Add point: Click on a region's path to add a new anchor point to it.

![](/img/deletePoint.svg =17x17) Delete point: Click on an anchor point to delete it.

![](/img/addRegion.svg =17x17) Union: Merge 2 overlapping regions into one single region. First, select a region using the select tool, then click the union tool, and then click on a second, overlapping region to join it with the first one.

![](/img/subtractRegion.svg =17x17) Difference: Subtract one region from another region. First, select one region, then click the difference tool, and then click into a second region to delete the overlapping part from the first region.

![](/img/splitRegion.svg =17x17) Division: Split a region based on an overlapping second region. First, select one region, then select the division tool, and then click into the second region to split the first one into 2 parts along the overlapping path. The resulting regions will be split along a perfectly matching contour.

![](/img/rotate.svg =17x17) Rotate a region. Click and drag in a region to rotate it around the point where you clicked.

![](/img/flipRegion.svg =17x17) Mirror a region. Select a region and flip it along the vertical axis.

![](/img/color.png =17x17) Select a color for your annotation.

![](/img/back.svg =17x17) Move a selected region to the back.

![](/img/backward.svg =17x17) Move a selected region stepwise behind other regions.

![](/img/front.svg =17x17) Move a selected region to the front.

![](/img/foreward.svg =17x17) Move a selected region stepwise in front of other regions.

![](/img/simplify.svg =17x17) Simplify a region path to contain less anchor points.

![](/img/toPolygon.svg =17x17) Convert Bézier curve to polygon path.

![](/img/toBezier.svg =17x17) Convert polygon path to Bézier curve.

![](/img/copy.svg =17x17) Copy a region.

![](/img/paste.svg =17x17) Paste a region, either in the same slice, or in another slice.

![](/img/save.svg =16x16) Save all annotations.

![](/img/screenshot.svg =16x16) Take a screenshot of the histological slice.

![](/img/delete.svg =17x17) Delete the selected region.

![](/img/findContours.svg =16x16) Find contours by applying a threshold to the slice image.

![](/img/undo.svg =16x16) Undo the last action.

![](/img/redo.svg =16x16) Redo the last action.
