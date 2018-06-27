/*
	This plugin is created by Koen Griffioen. Code adapted from the Openseadragon-selection plugin.
	If you need to contact me, please find me on github, KTGLeiden.
*/

(function($) {
    'use strict';

    if (!$.version || $.version.major < 2) {
        throw new Error('This version of OpenSeadragonScreenshot requires OpenSeadragon version 2.0.0+');
    }

    $.Viewer.prototype.screenshot = function(options) {
        if (!this.screenshotInstance || options) {
            options = options || {};
            options.viewer = this;
            this.screenshotInstance = new $.Screenshot(options);
        }
        return this.screenshotInstance;
    };


    /**
    * @class Screenshot
    * @classdesc Provides functionality for taking a screenshot
    * @memberof OpenSeadragon
    * @param {Object} options
    */
    $.Screenshot = function ( options ) {

        $.extend( true, this, {
            // internal state properties
            viewer:                 null,
            buttonActiveImg:        false,
            screenshotWidth: 	    1000, // Starting default
            screenshotHeight: 		1000, // Starting default
            showingMenu: 			false,
            makingScreenshot : 		false,
            menuDiv:  				null,
            loadingDiv: 			null,
            toggleButton:           null,
            navImages:              {
                screenshot: {
                    REST:   'selection_rest.png',
                    GROUP:  'selection_grouphover.png',
                    HOVER:  'selection_hover.png',
                    DOWN:   'selection_pressed.png'
                },
            },
            // options
            showOptions: 			false,
            showScreenshotControl:  true,
            keyboardShortcut:       null
        }, options );

        $.extend( true, this.navImages, this.viewer.navImages );
        
        if (!this.loadingDiv) {
	    	this.loadingDiv = document.createElement("div");
            this.loadingDiv.style.background = 'rgba(1,1,1, 0.3)';
	    	var img = document.createElement("img");
	    	img.src = this.viewer.prefixUrl + "ajax_loader_gray_32.gif";
			img.setAttribute('crossOrigin', 'anonymous');
	    	this.loadingDiv.style.position = "absolute";
	    	this.loadingDiv.style.top = "0px";
	    	this.loadingDiv.style.left = "0px";
	    	this.loadingDiv.style.width = this.viewer.viewport.containerSize.x + "px";
	    	this.loadingDiv.style.height = this.viewer.viewport.containerSize.y + "px";
	    	this.loadingDiv.style.backgroundColor = "#fff";
	    	var imgDiv = document.createElement("div");
	    	imgDiv.appendChild(img);
	    	imgDiv.style.margin = "-16px 0 0 -16px";
	    	imgDiv.style.position = "absolute";
	    	imgDiv.style.top = Math.round(this.viewer.viewport.containerSize.y / 2) + "px";
	    	imgDiv.style.left = Math.round(this.viewer.viewport.containerSize.x / 2) + "px";
	    	imgDiv.innerHTML += 'Loading image... <br>Takes too long?<br>';
	    	var closeLink = document.createElement('button');
	    	closeLink.onclick = function() {window.location.reload();}
	    	closeLink.innerHTML = "Refresh page";
	    	imgDiv.appendChild(closeLink);
	    	this.loadingDiv.appendChild(imgDiv)
	    	document.body.appendChild(this.loadingDiv);
            this.loadingDiv.className = 'screenshot-box';
            this.loadingDiv.style.display = "none";
        }

        if(this.showOptions && !this.menuDiv){
	    	// Add download link to canvas	    	
	    	var mainDiv = this.viewer.container;
	    	var newDiv = document.createElement('div');
	    	newDiv.style.position = "absolute";
	    	newDiv.style.backgroundColor = "#f3f3f3";
	    	newDiv.style.width = "30%";
	    	newDiv.style.minWidth = "400px";
	    	newDiv.style.padding = "20px";
	    	newDiv.style.margin = "-100px 0 0 -200px";
	    	newDiv.style.top = "50%";
	    	newDiv.style.left = "50%";

	    	newDiv.style.fontFamily = "Tahoma,Arial,sans-serif";
	    	// Make close button
	    	var closeButton = document.createElement('a');
	    	closeButton.style.position = "absolute";
	    	closeButton.innerHTML = "&times;";
	    	closeButton.style.position = "absolute";
	    	closeButton.style.top= "20px";
	    	closeButton.style.right= "30px";
	    	closeButton.style.fontSize = "30px";
	    	closeButton.style.fontWeight = "bold";
	    	closeButton.style.textDecoration= "none";
	    	closeButton.style.color= "#333";
	    	closeButton.style.cursor= "pointer";
	    	closeButton.id = "screenshotCloseButton";
	    	// Make a message field to show the actual current size
	    	var screenshotMessage = document.createElement('p');
	    	screenshotMessage.id = "screenshotTextMessage";
	    	screenshotMessage.display = "block";
	    	// Make a Div container for all the radio buttons
	    	var checkDiv = document.createElement('div');

	    	var divList = [];
	    	var lastDiv = document.createElement('div');
	    	lastDiv.style.fontSize = "20px";
	    	lastDiv.style.lineHeight = "20px";
	    	divList.push(lastDiv);
	    	var screenshotZFCheck = document.createElement('input');
	    	screenshotZFCheck.type="radio";
	    	screenshotZFCheck.name="screenshotForm";
	    	screenshotZFCheck.style.height = "25px";
	    	screenshotZFCheck.id = "screenshotZFCheck";
	    	screenshotZFCheck.setAttribute("checked", true);
	    	lastDiv.appendChild(screenshotZFCheck);
	    	lastDiv.innerHTML += "Zoom factor:";
	    	var screenshotZFInput = document.createElement('input');
	    	screenshotZFInput.type="range";
	    	screenshotZFInput.id = "screenshotZFInput";
	    	screenshotZFInput.max = "3";
	    	screenshotZFInput.min = "0.25";
	    	screenshotZFInput.step = "0.25";
	    	lastDiv.appendChild(screenshotZFInput);
	    	var ZFDisplay = document.createElement('span');
	    	ZFDisplay.setAttribute("id", "screenshotZFDisplay");
	    	ZFDisplay.setAttribute("value", "1");
	    	lastDiv.appendChild(ZFDisplay);
	    	lastDiv.innerHTML += " times";

	    	var lastDiv = document.createElement('div');
	    	lastDiv.style.fontSize = "20px";
	    	lastDiv.style.lineHeight = "20px";
	    	divList.push(lastDiv);
	    	var screenshotUseViewportSize = document.createElement('input');
	    	screenshotUseViewportSize.type="radio";
	    	screenshotUseViewportSize.style.height = "25px";
	    	screenshotUseViewportSize.id = "screenshotUseVpSize";
	    	screenshotUseViewportSize.name="screenshotForm";
	    	lastDiv.appendChild(screenshotUseViewportSize);
	    	lastDiv.innerHTML += "Just take a screenshot";

	    	if(this.viewer.annotationInstance){
		    	var lastDiv = document.createElement('div');
		    	divList.push(lastDiv);
		    	var screenshotDrawArrows = document.createElement('input');
		    	screenshotDrawArrows.type="checkbox";
		    	screenshotDrawArrows.style.height = "25px";
		    	screenshotDrawArrows.id = "screenshotDrawArrows";
		    	lastDiv.appendChild(screenshotDrawArrows);
		    	lastDiv.innerHTML += "Also draw annotations";
		    }

		    if(this.viewer.scalebarInstance){
		    	var lastDiv = document.createElement('div');
		    	divList.push(lastDiv);
		    	var screenshotDrawScalebar = document.createElement('input');
		    	screenshotDrawScalebar.type="checkbox";
		    	screenshotDrawScalebar.style.height = "25px";
		    	screenshotDrawScalebar.id = "screenshotDrawScalebar";
		    	lastDiv.appendChild(screenshotDrawScalebar);
		    	lastDiv.innerHTML += "Draw scalebar as well";
		    }

	    	// Button to download image
	    	var newLink = document.createElement('button');
	    	newLink.innerHTML = "Download image";
	    	newLink.onclick = this.takeScreenshot.bind(this, newLink);
	    	newLink.ontouchstart = this.takeScreenshot.bind(this, newLink);
	    	newLink.style.height = "40px";
	    	newLink.style.lineHeight = "30px";
	    	newLink.style.fontSize = "24px";
	    	newLink.style.margin = "0 auto";
	    	newLink.style.display = "block";

	    	// Append elements to the checkform
	    	for (var i = divList.length - 1; i >= 0; i--) {
	    		checkDiv.appendChild(divList[i]);
	    	}
	    	newDiv.appendChild(closeButton);
	    	newDiv.appendChild(checkDiv);
	    	newDiv.appendChild(screenshotMessage);
	    	newDiv.appendChild(newLink);
	    	mainDiv.appendChild(newDiv);

	    	this.showingMenu = false;
	    	this.menuDiv = newDiv;
	    	this.menuDiv.style.display = "none";

	    	// Add Events to all elements by id, since they won't work after HTML text addition somehow
	    	document.getElementById('screenshotZFCheck').onchange = this.menuUpdate.bind(this);
	    	document.getElementById('screenshotZFInput').onchange = this.menuUpdate.bind(this);
	    	document.getElementById('screenshotZFInput').oninput = this.menuUpdate.bind(this);
	    	document.getElementById('screenshotUseVpSize').onchange = this.menuUpdate.bind(this);
	    	document.getElementById('screenshotCloseButton').onclick = this.closeMenu.bind(this);

        }

 		// Add button
        var prefix = this.prefixUrl || this.viewer.prefixUrl || '';
        var useGroup = this.viewer.buttons && this.viewer.buttons.buttons;
        var anyButton = useGroup ? this.viewer.buttons.buttons[0] : null;
        var onFocusHandler = anyButton ? anyButton.onFocus : null;
        var onBlurHandler = anyButton ? anyButton.onBlur : null;
        if (this.showScreenshotControl) {
            this.toggleButton = new $.Button({
                element:    this.toggleButton ? $.getElement( this.toggleButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.ScreenshotToggle') || 'Make Screenshot',
                srcRest:    prefix + this.navImages.screenshot.REST,
                srcGroup:   prefix + this.navImages.screenshot.GROUP,
                srcHover:   prefix + this.navImages.screenshot.HOVER,
                srcDown:    prefix + this.navImages.screenshot.DOWN,
                onRelease:  this.toggleScreenshotMenu.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            if (useGroup) {
                this.viewer.buttons.buttons.push(this.toggleButton);
                this.viewer.buttons.element.appendChild(this.toggleButton.element);
            }
            if (this.toggleButton.imgDown) {
                this.buttonActiveImg = this.toggleButton.imgDown.cloneNode(true);
                this.toggleButton.element.appendChild(this.buttonActiveImg);
            }
		}

	    this.outerTracker = new $.MouseTracker({
	        element:            this.viewer.drawer.canvas,
	        clickTimeThreshold: this.viewer.clickTimeThreshold,
	        clickDistThreshold: this.viewer.clickDistThreshold,
	        clickHandler:       $.delegate( this, onOutsideClick ),
	        startDisabled:      !this.showingMenu,
	    });
	};

	// Optional shortcut
    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13) {
            this.confirm();
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleScreenshotMenu();
        }
    }

    function onOutsideClick() {
    	this.closeMenu();
    }

    $.extend( $.Screenshot.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.ControlDock.prototype */{

        closeMenu: function(){
        	if(this.menuDiv)
    			this.menuDiv.style.display = "none";
    		this.showingMenu = false;
    		this.outerTracker.setTracking(false);
    		return true;
        },

        takeScreenshot: function() {
        	var makingScreenshot = true;

    		this.loadingDiv.style.display = "inline";

	    	var containerSize = this.viewer.viewport.containerSize;

	    	var originalCSx = containerSize.x;
	    	var originalCSy = containerSize.y;

	    	var output_x_size = this.screenshotWidth; // Pixels, obviously
	    	var output_y_size = this.screenshotHeight; // Pixels, obviously

        	if(this.showOptions){
		    	var maxZoom = this.viewer.viewport.getMaxZoom();
		    	var currentZoom = this.viewer.viewport.getZoom();

		    	// Set element size (viewer)
		    	this.viewer.element.style.height = output_y_size + "px";
		    	this.viewer.element.style.width = output_x_size + "px";

		    	// Close menu
		    	this.closeMenu();
        	}

	    	var viewer = this.viewer;
	    	var loadingDiv = this.loadingDiv;
	    	// We need this function because we have to wait for the image to be fully loaded!
	    	var downloadFunction = function(){
        		viewer.world.getItemAt(0).removeAllHandlers('fully-loaded-change');
        		loadingDiv.style.display = "none";

	    		if(!makingScreenshot){
	    			return;
	    		}

				var Canvas = null;
				if(viewer.scalebarInstance && document.getElementById("screenshotDrawScalebar").checked){
		            var imgCanvas = viewer.drawer.canvas;
		            Canvas = document.createElement("canvas");
		            Canvas.width = imgCanvas.width;
		            Canvas.height = imgCanvas.height;
		            console.log(imgCanvas.width + "/" + imgCanvas.height);
		            var ctx = Canvas.getContext('2d');
            		ctx.drawImage(imgCanvas, 0, 0);
            		if(screenshotDrawArrows && viewer.annotationInstance)
            			viewer.annotationInstance.drawArrowsOnCanvas(Canvas);
		            var scalebarCanvas = viewer.scalebarInstance.getAsCanvas();
		            var location = viewer.scalebarInstance.getScalebarLocation();

	            	ctx.drawImage(scalebarCanvas, location.x, location.y);
				}
				else{
					Canvas = viewer.drawer.canvas;
				}

				Canvas.toBlob(function(blob){
    				saveAs(blob, "screenshot.png");
			        viewer.element.style.height = originalCSy + "px";
			        viewer.element.style.width = originalCSx + "px";
				});
				return;
	    	}

	    	if(!this.showOptions){
	    		if(viewer.world.getItemAt(0).getFullyLoaded()){
	    			downloadFunction();
	    		}
	    		else{
	    			viewer.world.getItemAt(0).addHandler('fully-loaded-change', downloadFunction);
	    		}
	    	}
	    	else{
		    	requestAnimationFrame(function(){ // NEeded for HTML/JS to find out the viewport just resized
					viewer.forceRedraw();
		    		if(viewer.world.getItemAt(0).getFullyLoaded()){
		    			downloadFunction();
		    		}
		    		else{
		    			viewer.world.getItemAt(0).addHandler('fully-loaded-change', downloadFunction);
		    		}
				});
		    }


        	return true;
        },

        toggleScreenshotMenu: function(){
        	if(!this.showOptions){
        		this.takeScreenshot();
        		return true;
        	}
            this.outerTracker.setTracking(!this.showingMenu);
        	if(this.showingMenu){
        		this.closeMenu.bind(this);
        		return true;
        	}
        	else{
        		this.showMenu();
        	}


	    	this.menuUpdate();

	    	return true;
        },

        showMenu: function(){
        	this.menuDiv.style.display = "inline";
        	this.showingMenu = true;
        },

        menuUpdate: function(){
			var ar = this.viewer.viewport.containerSize.y / this.viewer.viewport.containerSize.x;
    		var ZFchecked = document.getElementById('screenshotZFCheck').checked;
    		var thisVPChecked = document.getElementById('screenshotUseVpSize').checked;
    		if(thisVPChecked){
    			this.screenshotWidth = this.viewer.viewport.containerSize.x;
    			this.screenshotHeight = this.viewer.viewport.containerSize.y;
    		}
    		else{
				var ZF = document.getElementById('screenshotZFInput').value;

				var viewportWidth = this.viewer.viewport.containerSize.x;
				var viewportHeight = this.viewer.viewport.containerSize.y;

				this.screenshotWidth = viewportWidth * ZF;
				this.screenshotHeight = viewportHeight * ZF;

				document.getElementById('screenshotZFDisplay').innerHTML = ZF;
    		}
			document.getElementById('screenshotTextMessage').innerHTML = "Size of download: " + Math.round(this.screenshotWidth) + "x" + Math.round(this.screenshotHeight);
        }
    });



})(OpenSeadragon);
