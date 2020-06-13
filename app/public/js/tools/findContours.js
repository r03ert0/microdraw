/*global Microdraw*/
/*global paper*/
/* eslint-disable max-lines */
/* eslint-disable no-plusplus */
// eslint-disable-next-line no-unused-vars
/*global Microdraw*/
/*global paper*/

var ToolFindContours = {findContours: (function() {
  const {dom} = Microdraw;
  const me = {
    threshold: 200,
    smallestContour: 100,
    canvas: null,
    canvasBackup: null,
    widget: null,
    contourArray: [],
    down: false,

    // structurant element for morphological operations
    element: [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1]
    ],

    start: function (canvasSelector) {
      console.log("ContourWidget starting");
      me.canvas = dom.querySelector(canvasSelector);
      me.initWidget();

      me.canvasBackup = document.createElement('canvas');
      me.canvasBackup.width = me.canvas.width;
      me.canvasBackup.height = me.canvas.height;
      const backCtx = me.canvasBackup.getContext('2d');
      backCtx.drawImage(me.canvas, 0, 0);
    },

    close: function () {
      console.log("ContourWidget closing");
      const ctx = me.canvas.getContext('2d');
      ctx.drawImage(me.canvasBackup, 0, 0);
      dom.querySelector("#microdrawView").removeChild(me.widget);
    },

    // eslint-disable-next-line max-statements
    initWidget: function () {
      const content = `
      <style>
        div#cwContent {
          display: inline-block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate( -50%, -50% );
          border: thin solid black;
          z-index:10;
        }
        #cwContent * {
          background:#555;
          color: white;
        }
      </style>
      <div id="cwContent">
        <div id="cwHeader" style="background:#333">Find Contours</div>
        <div style="padding:10px">
          <span>Threshold</span>
          <input id="cwThreshold" type="range" min=0 max=255 />
          <br />
          <span id="cwMessage"></span>
          <br />
          <button id="cwCancel">Cancel</button>
          <button id="cwClose">Add Regions</button>
        </div>
      </div>
      `;
      me.widget = document.createElement("span");
      me.widget.innerHTML = content;
      dom.querySelector("#microdrawView").appendChild(me.widget);

      dom.getElementById('cwThreshold').addEventListener('input', (e) => {
        e.preventDefault();
        e.stopPropagation();
        me.threshold = parseFloat(e.target.value);
        me.thresholdImage();
      });
      dom.getElementById('cwThreshold').addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        me.threshold = parseFloat(e.target.value);
        me.findContours();
      });
      dom.getElementById('cwClose').onclick = () => {
        me.close();
        me.addRegions();
      };
      dom.getElementById('cwCancel').onclick = () => {
        me.close();
      };
      dom.getElementById('cwHeader').addEventListener('mousedown', (e) => {
        me.down = true;
        me.prevX = e.screenX;
        me.prevY = e.screenY;
      });
      dom.querySelector('body').addEventListener('mousemove', (e) => {
        if(me.down === true) {
          const div = dom.querySelector('#cwContent');
          const [x, y] = [e.screenX, e.screenY];
          const [dx, dy] = [x - me.prevX, y - me.prevY];
          const {offsetLeft, offsetTop} = div;
          [me.prevX, me.prevY] = [x, y];
          div.style.left = `${parseFloat(offsetLeft)+dx}px`;
          div.style.top = `${parseFloat(offsetTop)+dy}px`;
        }
      });
      dom.querySelector('body').addEventListener('mouseup', () => {
        me.down = false;
      });
    },
    boxFilter: function ({img, dim, radius, order} = {img:null, dim:null, radius:1, order:1}) {
      // eslint-disable-next-line max-statements
      const boxFilter1 = function (img1, dim1, r) {
        let i, j;
        const [W, H]=dim1;
        let sum, val;
        const resx=new Float32Array(W*H);
        const resy=new Float32Array(W*H);

        // x direction
        for(j=0; j<H; j++) {
          sum=0;
          for(i=0; i<r; i++) {
            sum+=img1[j*W+i];
          }
          for(i=0; i<=r; i++) {
            sum+=img1[j*W+(i+r)];
            val=sum/(r+1+i);
            resx[j*W+i]=val;
          }
          for(i=r+1; i<W-r; i++) {
            sum+=img1[j*W+(i+r)];
            sum-=img1[j*W+(i-r-1)];
            val=sum/(2*r+1);
            resx[j*W+i]=val;
          }
          for(i=W-r; i<W; i++) {
            sum-=img1[j*W+(i-r-1)];
            val=sum/(r+(W-i));
            resx[j*W+i]=val;
          }
        }

        // y direction
        for(i=0; i<W; i++) {
          sum=0;
          for(j=0; j<r; j++) {
            sum+=img1[j*W+i];
          }
          for(j=0; j<=r; j++) {
            sum+=img1[(j+r)*W+i];
            val=sum/(r+1+j);
            resy[j*W+i]=val;
          }
          for(j=r+1; j<H-r; j++) {
            sum+=resx[(j+r)*W+i];
            sum-=resx[(j-r-1)*W+i];
            val=sum/(2*r+1);
            resy[j*W+i]=val;
          }
          for(j=H-r; j<H; j++) {
            sum-=resx[(j-r-1)*W+i];
            val=sum/(r+(H-j));
            resy[j*W+i]=val;
          }
        }

        // overwrite img
        for(i=0; i<W*H; i++) {
          img1[i] = resy[i];
        }
      };

      for(let i=0; i<order; i++) {
        boxFilter1(img, dim, radius);
      }
    },

    invertFilter: function ({grey, dim}) {
      const [W, H] = dim;

      for(let i=0; i<W*H; i++) {
        grey[i] = 255-grey[i];
      }
    },

    greyscaleFilter: function ({rgba, grey, dim}) {
      const [W, H] = dim;

      // convert to greyscale using rec601 luma formula
      for(let i=0; i<W*H; i++) {
        grey[i] = rgba[4*i]*0.3 + rgba[4*i+1]*0.59 + rgba[4*i+2]*0.11;
      }
    },

    thresholdFilter: function ({grey, dim, threshold, up}) {
      const [W, H] = dim;

      // compute the threshold mask
      if(up) {
        for (let i=0; i<W*H; i++) {
          if(grey[i]>=threshold) {
            grey[i] = 255;
          } else {
            grey[i] = 0;
          }
        }
      } else {
        for (let i=0; i<W*H; i++) {
          if(grey[i]>=threshold) {
            grey[i] = 0;
          } else {
            grey[i] = 255;
          }
        }
      }
    },

    // eslint-disable-next-line max-statements
    dilateFilter: function ({grey, dim, niter}) {
      const [W, H] = dim;
      let i, j, k;
      const tmp = new Float32Array(W*H);

      for(let iter=0; iter<niter; iter++) {
        for(i=0; i<W; i++) {
          for(j=0; j<H; j++) {
            if(grey[j*W+i] > 0) {
              // eslint-disable-next-line max-depth
              for(k of me.element) {
                // eslint-disable-next-line max-depth
                if(grey[(j+k[0])*W+(i+k[1])] === 0) {
                  tmp[(j+k[0])*W+(i+k[1])] = 255;
                }
              }
            }
          }
        }
        for (i = 0; i < W*H; i++) {
          grey[i] |= tmp[i];
          tmp[i] = grey[i];
        }
      }
    },

    // eslint-disable-next-line max-statements
    erodeFilter: function ({grey, dim, niter}) {
      const [W, H] = dim;
      let i, j, k;
      const tmp = new Float32Array(W*H);

      for(let iter=0; iter<niter; iter++) {
        for(i=0; i<W; i++) {
          for(j=0; j<H; j++) {
            if(grey[j*W+i] > 0) {
              // eslint-disable-next-line max-depth
              for(k of me.element) {
                // eslint-disable-next-line max-depth
                if(grey[(j+k[1])*W+(i+k[0])] === 0) {
                  tmp[j*W+i] = 1;
                }
              }
            }
          }
        }
        for (i=0; i<W*H; i++) {
          if(tmp[i]) {
            grey[i] = 0;
          }
        }
      }
    },

    /**
     * @description Decreases "stairs" effect by resampling to the middle of each edge
     * @param {array} con Contour, represented as an array of 2d coordinates [x, y]
     * @returns {void} Changes the array in-place
     */
    resampleContour: function (con) {
      let [prevx, prevy] = con[con.length-1];
      let x, y;
      for(let i=0; i<con.length; i++) {
        [x, y] = con[i];
        con[i][0] = (prevx+x)/2;
        con[i][1] = (prevy+y)/2;
        [prevx, prevy] = [x, y];
      }

      return con;
    },

    // eslint-disable-next-line max-statements
    getContours: function ({grey, dim}) {
      const [W, H] = dim;
      const tmp = new Float32Array(W*H);
      let i, k;
      const search = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      let [a, b, a0, b0, ind] = [0, 0, 0, 0, 0];
      let dx, dy;
      let x, x0, y, y0;
      const contourArray = [];

      do {
        if(grey[b*W+a] > 0) {
          if(tmp[b*W+a] === 2) {
            while(grey[b*W+a] > 0) {
              a++;
            }
          } else {
            [x0, y0, x, y] = [a, b, a, b];
            const con = [[x0, y0]];
            do {
              // eslint-disable-next-line max-depth
              for(k=0; k<search.length; k++) {
                [dx, dy]=search[ind];
                // eslint-disable-next-line max-depth
                if(grey[(y+dy)*W+(x+dx)] > 0) {
                  x+=dx;
                  y+=dy;
                  con.push([x, y]);
                  ind = (search.length+ind-1)%search.length;
                  break;
                } else {
                  ind = (ind+1)%search.length;
                }
              }
            } while (x!==x0 || y!==y0);
            for(i of con) {
              [x, y] = i;
              tmp[y*W + x] = 2;
            }
            if(con.length>=me.smallestContour) {
              contourArray.push(me.resampleContour(con));
            }
            [a, b] = [a0, b0];
          }
        } else {
          [a0, b0] = [a, b];
        }

        if(a++===W-1) {
          a=0;
          b++;
        }
      } while(b<H-1);

      return contourArray;
    },

    // eslint-disable-next-line max-statements
    thresholdImage: function () {
      const ctx = me.canvas.getContext('2d');
      ctx.drawImage(me.canvasBackup, 0, 0);
      const [W, H] = [me.canvas.width, me.canvas.height];
      const imageData = ctx.getImageData(0, 0, W, H);
      const rgba = imageData.data;
      const grey = new Float32Array(W*H);

      // set non-assigned pixels (those with alpha=0) to white
      for(let i=0; i<W*H; i++) {
        if(rgba[4*i+3] === 0) {
          [rgba[4*i+0], rgba[4*i+1], rgba[4*i+2], rgba[4*i+3]] = [255, 255, 255, 255];
        }
      }

      me.greyscaleFilter({rgba, grey, dim: [W, H]});
      me.thresholdFilter({grey, dim: [W, H], threshold: me.threshold, up: false});
      me.boxFilter({img: grey, dim: [W, H], radius: 3, order: 2});
      me.thresholdFilter({grey, dim: [W, H], threshold: 127, up: true});

      /*
      for(let i=0;i<W*H;i++) {
          [rgba[4*i+0],rgba[4*i+1],rgba[4*i+2]] = [grey[i],grey[i],grey[i]];
      }
      */

      // apply threshold to original colour image
      for(let i=0; i<W*H; i++) {
        if(grey[i]) {
          rgba[4*i+1] = 0;
          rgba[4*i+2] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    },

    // eslint-disable-next-line max-statements
    findContours: function () {
      const {canvas} = me;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(me.canvasBackup, 0, 0);
      const [W, H] = [canvas.width, canvas.height];
      var imageData = ctx.getImageData(0, 0, W, H);
      var rgba = imageData.data;
      const grey = new Float32Array(W*H);

      // set non-assigned pixels (those with alpha=0) to white
      for(let i=0; i<W*H; i++) {
        if(rgba[4*i+3] === 0) {
          [rgba[4*i+0], rgba[4*i+1], rgba[4*i+2], rgba[4*i+3]] = [255, 255, 255, 255];
        }
      }

      me.greyscaleFilter({rgba, grey, dim: [W, H]});
      me.thresholdFilter({grey, dim: [W, H], threshold: me.threshold, up: false});
      me.boxFilter({img: grey, dim: [W, H], radius: 3, order: 2});
      me.thresholdFilter({grey, dim: [W, H], threshold: 127, up: true});

      /*
      for(let i=0; i<W*H; i++) {
        rgba[4*i+0]=grey[i];
        rgba[4*i+1]=grey[i];
        rgba[4*i+2]=grey[i];
      }
      ctx.putImageData(imageData, 0, 0);
      */

      // morphological opening
      me.erodeFilter({grey, dim: [W, H], niter: 3});
      me.dilateFilter({grey, dim: [W, H], niter: 3});

      // morphological closing
      me.dilateFilter({grey, dim: [W, H], niter: 3});
      me.erodeFilter({grey, dim: [W, H], niter: 3});

      // set boundary pixels to 0
      for(let i=0; i<W; i++) {
        grey[0*W+i] = 0;
        grey[(H-1)*W+i] = 0;
      }
      for(let j=0; j<H; j++) {
        grey[j*W+0] = 0;
        grey[j*W+W-1] = 0;
      }

      // get contours
      me.contourArray.length = 0;
      me.contourArray.push(...me.getContours({grey, dim: [W, H]}));

      // display contours
      ctx.putImageData(imageData, 0, 0);
      ctx.lineWidth = 5;
      for(const con of me.contourArray) {
        const [r, g, b] = [255*Math.random()|0, 255*Math.random()|0, 255*Math.random()|0];

        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.moveTo(...con[0]);
        for(const p of con) {
          ctx.lineTo(...p);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // display information message
      dom.querySelector("#cwMessage").innerHTML = `${me.contourArray.length} contours detected`;
    },

    addRegions: function () {
      const pixelSize = me.canvas.width/me.canvas.clientWidth;
      for(const con of me.contourArray) {
        const path = new paper.Path({segments: con.map((p) => paper.view.viewToProject(new paper.Point(p[0]/pixelSize, p[1]/pixelSize)))});
        path.simplify();
        console.log(path.length);
        Microdraw.region = Microdraw.newRegion({path});
        Microdraw.region.path.closed = true;
        // Microdraw.region.path.fullySelected = true;
      }
    },

    /**
     * @function click
     * @desc simplify. Simplify the selected path.
     * @param {string} prevTool The previous tool to which the selection goes back
     * @returns {void}
     */
    click : function click(prevTool) {
      me.start('#openseadragon1 canvas');
      Microdraw.selectedTool = prevTool;
    }
  };

  return me;
}())};
