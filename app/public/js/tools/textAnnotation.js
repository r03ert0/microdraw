/* eslint-disable max-statements */
/* eslint-disable no-unused-vars */
/* global Microdraw */
/* global paper */

// eslint-disable-next-line no-implicit-globals
var ToolTextAnnotation = {textAnnotation: (function() {
  const {dom} = Microdraw;

  const tool = {
    addTextAnnotation: (event) => {
      // deselect previously selected region
      if( Microdraw.region ) { Microdraw.region.path.selected = false; }

      const textEl = dom.querySelector('#add-text-annotation > input[type="text"]');
      const colorEl = dom.querySelector('#add-text-annotation > input[type="color"]');
      const fontSizeEl = dom.querySelector('#add-text-annotation > input[type="number"]');
      const {value: content} = textEl;
      const {value: fillColor} = colorEl;
      const fontSize = Number(fontSizeEl.value);

      // const path = new paper.Path({segments:[point]});
      const text = new paper.PointText({
        point: tool.point,
        content,
        fillColor,
        fontSize,
        fontFamily: 'sans-serif',
        fontWeight: 'normal'
      });

      // path.strokeWidth = Microdraw.config.defaultStrokeWidth;
      Microdraw.region = Microdraw.newRegion({path: text, name: 'textAnnotation'});
      // Microdraw.region.path.fillColor.alpha = 0;
      // Microdraw.region.path.selected = true;

      // Microdraw.commitMouseUndo();

      const obj = dom.querySelector("#text-annotation-panel");
      obj.style.display = "none";
    },

    _cssColorToHex: (color) => {
      const rgb = color.replace("rgb(", "").replace(")", "")
        .split(",");
      const hex = rgb.map((s) => ("00" + Number(s).toString(16)).slice(-2));

      return "#" + hex.join("");
    },

    updateTextAnnotation: (event) => {
      const textEl = dom.querySelector('#add-text-annotation > input[type="text"]');
      const colorEl = dom.querySelector('#add-text-annotation > input[type="color"]');
      const fontSizeEl = dom.querySelector('#add-text-annotation > input[type="number"]');
      const {value: content} = textEl;
      const {value: fillColor} = colorEl;
      const fontSize = Number(fontSizeEl.value);

      tool.item.content = content;
      tool.item.fillColor = fillColor;
      tool.item.fontSize = fontSize;

      const obj = dom.querySelector("#text-annotation-panel");
      obj.style.display = "none";
    },

    updateTextAnnotationPanel: (item) => {
      const {content, fontSize} = item;
      const fillColor = item.fillColor.toCSS();
      console.log({content, fillColor, fontSize});
      const x = item.point._x;
      const y = item.point._y;

      tool.item = item;
      tool.point = [x, y];

      dom.querySelector("#text-annotation-panel").style.display = "block";
      dom.querySelector("#add-text-annotation > div > button:nth-child(1)").style.display = "none";
      dom.querySelector("#add-text-annotation > div > button:nth-child(2)").style.display = "inline-block";

      const textEl = dom.querySelector('#add-text-annotation > input[type="text"]');
      const colorEl = dom.querySelector('#add-text-annotation > input[type="color"]');
      const fontSizeEl = dom.querySelector('#add-text-annotation > input[type="number"]');
      textEl.value = content;
      colorEl.value = tool._cssColorToHex(fillColor);
      fontSizeEl.value = fontSize;
    },

    cancelTextAnnotation: () => {
      const obj = dom.querySelector("#text-annotation-panel");
      obj.style.display = "none";
    },

    /**
     * @function mouseDown
     * @param {object} point The point where you click (x,y)
     * @returns {void}
     */
    mouseDown: function mouseDown(point) {
      // mouseUndo.callback is expected to be a function
      // Microdraw.mouseUndo.callback = ((currentFlag) => () => {
      //   textAnnotationFlag = currentFlag;
      // })(textAnnotationFlag);
      tool.point = point;
      dom.querySelector("#text-annotation-panel").style.display = "block";
      dom.querySelector("#add-text-annotation > div > button:nth-child(1)").style.display = "inline-block";
      dom.querySelector("#add-text-annotation > div > button:nth-child(2)").style.display = "none";
    },

    /**
     * @function click
     * @desc Convert polygon path to bezier curve
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click: function click(prevTool) {
      Microdraw.navEnabled = false;
    }
  };

  return tool;
}())};
