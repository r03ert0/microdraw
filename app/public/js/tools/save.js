/*global Microdraw*/
/*global paper*/
/*global $*/

var dbroot = '/api'

var ToolSave = { save : (function(){

    /**
     * @function microdrawDBSave
     * @desc Save SVG overlay to microdrawDB
     * @returns {void}
     */
    var microdrawDBSave = function microdrawDBSave() {
        if( Microdraw.debug ) {
            console.log("> save promise");
        }

        var i;
        var promiseArray = [];
        var savedSections = "Saving sections: ";

        Object.keys(Microdraw.ImageInfo).forEach(function(sl) {
            if ((Microdraw.config.multiImageSave === false) && (sl !== Microdraw.currentImage)) {
                return;
            }
            // configure value to be saved
            var section = Microdraw.ImageInfo[sl];
            var value = {};
            value.Regions = [];
            for( i = 0; i < section.Regions.length; i += 1 ) {
                var el = {};
                el.path = JSON.parse(section.Regions[i].path.exportJSON());
                el.name = section.Regions[i].name;
                value.Regions.push(el);
            }

            // check if the section annotations have changed since loaded by computing a hash
            var h = Microdraw.hash(JSON.stringify(value.Regions)).toString(16);
            if( Microdraw.debug > 1 ) { console.log("hash:", h, "original hash:", section.Hash); }
            // if the section hash is undefined, this section has not yet been loaded. do not save anything for this section
            if( typeof section.Hash === "undefined" || h === section.Hash ) {
                if( Microdraw.debug > 1 ) { console.log(`sl ${sl}`, "No change, no save"); }
                value.Hash = h;

                return;
            }
            debugger
            value.Hash = h;
            debugger
            savedSections += sl.toString() + " ";

            // post data to database
            var pr = new Promise(function(resolve, reject) {
                (function(sl2, h2) {
                    $.ajax({
                        url:dbroot,
                        type:"POST",
                        data: {
                            action: "save",
                            fileID: `${Microdraw.source}&slice=${sl}`,
                            Hash: h2,
                            annotation: JSON.stringify(value)
                        },
                        success: function(result) {
                            console.log("< microdrawDBSave. Successfully saved regions:",
                                Microdraw.ImageInfo[sl2].Regions.length,
                                "section: " + sl2.toString(),
                                "response:",
                                result
                            );
                            //update hash
                            Microdraw.ImageInfo[sl2].Hash = h2;
                            resolve("section " + sl2);
                        },
                        error: function(jqXHR, textStatus, err) {
                            console.log("< microdrawDBSave. ERROR: " + textStatus + " " + err, "section: " + sl2.toString());
                            reject(err);
                        }
                    });
                }(sl, h));
            });
            promiseArray.push(pr);
        });
        Promise.all(promiseArray).then(function(values) {
            console.log(values);
        });

        //show dialog box with timeout
        $('#saveDialog')
            .html(savedSections)
            .fadeIn();
        setTimeout(function() {
            $("#saveDialog")
            .fadeOut(500);
        }, 2000);
    }

    var tool = {

        /**
         * @function click
         * @desc save the annotations
         * @param {string} prevTool The previous tool to which the selection goes back
         * @returns {void}
         */
        click : function click(prevTool) {
            microdrawDBSave();
            Microdraw.backToPreviousTool(prevTool);
        }
    }
    
    return tool;
}())}

/**
 * @function microdrawDBLoad
 * @desc Load SVG overlay from microdrawDB
 * @returns {Promise} A promise to return an array of paths of the current section.

 */
Microdraw.microdrawDBLoad = function(){
    return new Promise(function(resolve,reject){
        if( Microdraw.debug ){
            console.log("> save.js microdrawDBLoad promise")
        }

        $.getJSON(dbroot,{
            action : "load_last",
            fileID : `${Microdraw.source}&slice=${Microdraw.currentImage}`
        })
            .success(function (data){
                var i, json, reg;
                Microdraw.annotationLoadingFlag = false;

                // Because of asynchrony, the section that just loaded may not be the one that the user
                // intended to get. If the section that was just loaded does not correspond to the current section,
                // do not display this one and load the current section.
                if( Microdraw.section !== Microdraw.currentImage ) {
                    console.log("> save.js microdrawDBLoad: Loaded section does not correspond with the current section.")
                    Microdraw.microdrawDBLoad()
                        .then(function(data){
                            resolve(data)
                        })
                        .catch(function(error){
                            reject(error)
                        })

                }else{
                    if( $.isEmptyObject(data) ) {
                        Microdraw.ImageInfo[Microdraw.currentImage].Hash = Microdraw.hash(JSON.stringify(Microdraw.ImageInfo[Microdraw.currentImage].Regions)).toString(16);
                        if( Microdraw.debug ){
                            console.log("< save.js microdrawDBLoad: returned data is an empty object")
                        }
                        resolve([]);
                    }else{
                        resolve(data)
                    }
                }
            })
            .error(function(jqXHR, textStatus, err) {
                console.log("< microdrawDBLoad resolve ERROR: " + textStatus + " " + err);
                Microdraw.annotationLoadingFlag = false;
                reject(err);
            });
            
    })
}