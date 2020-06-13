/*global Microdraw*/

var ToolColor = { color : (function() {
  const {dom} = Microdraw;
  var tool = {
    _detachLabelsetContainer: () => {
      const obj = dom.querySelector("#labelset");
      obj.style.display = "none";
    },
    _attachLabelsetContainer: () => {
      const obj = dom.querySelector("#labelset");
      dom.querySelector("body").appendChild(obj);
      obj.style.display = "block";
      obj.querySelector("span#labels-name").textContent = Microdraw.ontology.name;
      obj.querySelector("#labels-close").onclick = tool._detachLabelsetContainer;
      obj.querySelector("#label-list").innerHTML = "";
    },

    _attachLabel: (l, i) => {
      const obj = dom.querySelector("#labelset");
      const la = obj.querySelector("#label-template").cloneNode(true);
      la.setAttribute("data-index", i);
      la.querySelector(".label-color").style["background-color"] = `rgb(${l.color[0]},${l.color[1]},${l.color[2]})`;
      la.querySelector(".label-name").textContent = l.name;
      la.onclick = () => {
        Microdraw.currentLabelIndex = i;
        Microdraw.updateLabelDisplay();
        tool._detachLabelsetContainer();
      };
      obj.querySelector("#label-list").appendChild(la);
      la.style.display = "block";
    },

    /**
     * @function color
     * @desc Select a color to draw with
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click: function (prevTool) {
      const me = Microdraw;
      tool._attachLabelsetContainer();
      for(let i = 0; i<me.ontology.labels.length; i += 1) {
        const l = me.ontology.labels[i];
        tool._attachLabel(l, i);
      }
      Microdraw.selectedTool = prevTool;
    }
  };

  return tool;
}())};
