/* eslint-disable no-unused-vars */
/* global Microdraw, Vue */

window.ToolLayers = { layers : (function() {
  const {dom} = Microdraw;
  const tool = {
    layers: [],
    rowTemplate: `
    <ul class="layer-item">
      <li><span style="width:300px;overflow-wrap:anywhere">layer.url</span></li>
      <li><b class="layer-item">Name:</b> <span style="width:70px">layer.name</span></li>
      <li><b class="layer-item"> Opacity (%):</b>
        <input class="layer-value" value="layer.opacity" onchange="Microdraw.tools.layers.changeOpacity(event)" />
        <input type="range" value="layer.opacity" min="0" max="100" oninput="Microdraw.tools.layers.changeOpacity(event)" style="width:100px"/>
        </li>
      <li><b class="layer-item">Position (%)</b>
        <input class="layer-value" value="0" onchange="Microdraw.tools.layers.changeX(event)" />
        <input class="layer-value" value="0" onchange="Microdraw.tools.layers.changeY(event)" /></li>
      <li><b class="layer-item">Rotation (deg):</b> <input class="layer-value" value="0" onchange="Microdraw.tools.layers.changeRotation(event)" /></li>
      <li><b class="layer-item"> First slice:</b> <input class="layer-value" value="0" min="0" max="layer.maxSlice" onchange="Microdraw.tools.layers.changeFirstSlice(event)" /> (0 - layer.maxSlice)</li>
      <li><b class="layer-item"> Last slice:</b> <input class="layer-value" value="layer.maxSlice" min="0" max="layer.maxSlice" onchange="Microdraw.tools.layers.changeLastSlice(event)" /> (0 - layer.maxSlice)</li>
      <li><button onclick="Microdraw.tools.layers.deleteLayer(event)">Delete layer</button></li>
    </ul>
    `,
    fetchDZI: async (url) => {
      let dzi = null;

      try {
        const _ = new URL(url);
        const response0 = await fetch(url, { method: 'HEAD' });
        if (response0.ok) {
          const response = await fetch(url);
          dzi = await response.json();
        }
      } catch (error) {
        console.log('Error:', error);
      }

      return dzi;
    },
    addRow: () => {
      dom.querySelector("#add-layer-panel").style.display = "block";
      dom.querySelector("#add-layer-button").style.display = "none";
      dom.querySelector("#layers-list").classList.add("small");
      console.log("addRow");
    },
    deleteLayer: (e) => {
      console.log("deleteLayer", e);

      // get layer from UI
      const el = e.target;
      const div = el.closest("div.layer");

      // get layer data before deleting
      const url = div.querySelectorAll("span")[0].innerText;
      const name = div.querySelectorAll("span")[1].innerText;

      // delete layer from UI
      div.remove();

      // delete layer from layers array
      const index = tool.layers.findIndex((layer) => layer.url === url);
      tool.layers.splice(index, 1);

      // reload the viewer
      const currentImageIndex = Microdraw.imageOrder.indexOf(Microdraw.currentImage);
      Microdraw.loadImage(currentImageIndex);
    },
    changeOpacity: (e) => {
      const {value} = e.target;

      if (e.target.type === "range") {
        e.target.parentElement.parentElement.querySelectorAll("input")[0].value = value;
      } else {
        e.target.parentElement.parentElement.querySelectorAll("input")[1].value = value;
      }

      tool.layers[0].opacity = value / 100;
      Microdraw.viewer.world.getItemAt(1).setOpacity(value / 100);
    },
    changeX: (e) => {
      let {value} = e.target;
      value /= 100;
      tool.layers[0].x = value;
      Microdraw.viewer.world.getItemAt(1).setPosition({x: value, y: tool.layers[0].y});
    },
    changeY: (e) => {
      let {value} = e.target;
      value /= 100;
      tool.layers[0].y = value;
      Microdraw.viewer.world.getItemAt(1).setPosition({x: tool.layers[0].x, y: value});
    },
    changeRotation: (e) => {
      const {value} = e.target;
      tool.layers[0].rotation = value;
      Microdraw.viewer.world.getItemAt(1).setRotation(value);
    },
    changeFirstSlice: (e) => {
      const {value} = e.target;
      tool.layers[0].firstSlice = Number(value);
    },
    changeLastSlice: (e) => {
      const {value} = e.target;
      tool.layers[0].lastSlice = Number(value);
    },
    _addLayerToViewer: (url, tileIndex, imageSources, opacity) => {
      let tileSource = imageSources.tileSources[tileIndex];
      if (tileSource[0] === "/") {
        const tmp = new URL(url);
        tileSource = tmp.origin + tileSource;
      }
      const options = {
        tileSource,
        opacity,
        compositeOperation: "source-over"
      };
      Microdraw.viewer.addTiledImage(options);
    },

    addLayer: (name, url, opacityPercent, dzi) => {
      const el = document.createElement("div");
      el.className = "layer";
      const rowInstance = tool.rowTemplate
        .replace("layer.name", name)
        .replace("layer.url", url)
        .replaceAll("layer.opacity", opacityPercent)
        .replaceAll("layer.maxSlice", dzi.tileSources.length - 1);
      el.innerHTML = rowInstance;
      dom.querySelector("#layers-list").appendChild(el);

      tool.layers.push({
        name,
        url,
        el,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 0.5,
        imageSources: dzi,
        firstSlice: 0,
        lastSlice: dzi.tileSources.length - 1
      });

      tool.updateLayers();
    },
    _updateLayersFromTable: () => {
      // update layer slice
      const arr = dom.querySelectorAll("#layers-panel table tr");
      for (let i = 1; i < arr.length; i++) {
        const tr = arr[i];
        const name = tr.querySelectorAll("span")[0].innerText;
        const url = tr.querySelectorAll("span")[1].innerText;
        const index = tool.layers.findIndex((layer) => layer.name === name && layer.url === url);
        const opacity = tr.querySelectorAll("input")[0].value / 100;
        tool.layers[index].opacity = opacity;
        Microdraw.viewer.world.getItemAt(index + 1).setOpacity(opacity);
      }
    },
    updateLayers: () => {
      // return if there's no layers
      if (tool.layers.length === 0) {
        return;
      }

      // current slice index
      const currentImage = Number(Microdraw.currentImage);

      // total number of slices
      const totalImages = Microdraw.imageOrder.length;

      // get 1st and last slice of layers[0]
      const layerIndex = 0;
      const {url, opacity, firstSlice, lastSlice, imageSources} = tool.layers[layerIndex];

      // get the sliceIndex in layers[0] corresponding to sliceIndex in the viewer
      const [a0, a1, l0, l1] = [0, totalImages - 1, firstSlice, lastSlice];
      // ia = (il) => {a0=6;a1=58;l0=94;l1=12;m=(l0-l1)/(a0-a1);n=l0-a0*m;return (il-n)/m};
      const il = (ia) => {
        m=(l0-l1)/(a0-a1); n=l0-a0*m;

        return ia*m+n;
      };
      const tileIndex = Math.floor(il(currentImage));

      // add layer to viewer
      tool._addLayerToViewer(url, tileIndex, imageSources, opacity);

      // update the layer
      tool._updateLayersFromTable();
    },

    // eslint-disable-next-line max-statements
    addLayerUI: async () => {
      const arr = dom.querySelectorAll("#add-layer-panel input");
      const name = arr[0].value;
      const url = arr[1].value;

      // check if url resolves and contains a good json
      const dzi = await tool.fetchDZI(url);
      if (!dzi) {
        arr[1].style.backgroundColor = "#fcc";

        return;
      }

      // cleanup the UI
      arr[1].parentElement.style.backgroundColor = "none";
      arr[0].value = "";
      arr[1].value = "";
      dom.querySelector("#add-layer-panel").style.display = "none";
      dom.querySelector("#add-layer-button").style.display = "block";
      dom.querySelector("#layers-list").classList.remove("small");

      // add the layer
      tool.addLayer(name, url, 0.5 * 100, dzi);
    },
    cancelAddLayerUI: () => {
      dom.querySelector("#add-layer-panel").style.display = "none";
      dom.querySelector("#add-layer-button").style.display = "block";
      dom.querySelector("#layers-list").classList.remove("small");
      console.log("cancelAddLayerUI");
    },
    _detachLayersContainer: () => {
      const obj = dom.querySelector("#layers-panel");
      obj.style.display = "none";
    },
    _isDragging: false,
    _offsetX: 0,
    _offsetY: 0,
    _attachLayersContainer: () => {
      const obj = dom.querySelector("#layers-panel");
      obj.style.display = "block";

      obj.addEventListener('mousedown', function(e) {
        if (e.target.id !== "layers-panel") { return; }
        tool._isDragging = true;
        const {top, left, width, height} = obj.getBoundingClientRect();
        tool._offsetX = e.clientX - left - width/2;
        tool._offsetY = e.clientY - top - (height)/2;
        obj.classList.add('dragging');
      });

      dom.addEventListener('mousemove', function(e) {
        if (!tool._isDragging) { return; }
        obj.style.left = (e.clientX - tool._offsetX) + 'px';
        obj.style.top = (e.clientY - tool._offsetY) + 'px';
      });

      dom.addEventListener('mouseup', function() {
        if (!tool._isDragging) { return; }
        tool._isDragging = false;
        obj.classList.remove('dragging');
      });
    },

    _attachLayer: (l, i) => {
      const obj = dom.querySelector("#layers-panel");
      obj.style.display = "block";
    },

    /**
     * @desc Add layers of deep zoom images
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click: function (prevTool) {
      tool._attachLayersContainer();
      Microdraw.selectedTool = prevTool;
    }
  };

  return tool;
}())};
