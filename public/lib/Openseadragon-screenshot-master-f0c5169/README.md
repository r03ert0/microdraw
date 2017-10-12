# Openseadragon-screenshot
This is a plugin for the openseadragon viewer that allows you to take a screenshot of whatever it is you are looking at in the browser. It includes an optional menu.

### Wanna see it in action?
https://ktgleiden.github.io/openseadragon-screenshot/

## Worthy to note
This plugin will work with the master branch of openseadragon (no stable release yet). If you need it to work with older versions, the only thing is that [This](https://github.com/openseadragon/openseadragon/pull/837/commits/f1cdf906535262783a9a94cb2dcdd5362e47b55c) commit is needed, since the viewer has to wait until the image has loaded completely, until we make the screenshot. This will most probably be included in the next stable release, but if you just can't wait: add the code manually ;)

## Installation instructions
- Download openseadragon-screenshot.js
- Download [Filesaver.js](https://github.com/eligrey/FileSaver.js/), which I am using for creating the screenshot and downloading it.
    + Note: Filesaver.js has another dependency, which adds the .ToBlob() method for IE. If you want IE support, also download this! [Canvas-toBlob.js](https://github.com/eligrey/canvas-toBlob.js)
- Use the following code to add a button to make a screenshot:
```
    // viewer will be your OpenSeaDragon viewer object
    viewer.screenshot({
        showOptions: true, // Default is false
        keyboardShortcut: 'p', // Default is null
        showScreenshotControl: true // Default is true
        
    });
```

##Troubleshooting
If this plugin reports that "your canvas is tainted" and it cannot export it in that case, please initialize the viewer object with the following parameter:
```
    var viewer = Openseadragon({
        ...,
        crossOriginPolicy: "Anonymous"
    })
```
