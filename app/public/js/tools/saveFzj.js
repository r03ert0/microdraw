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

          Microdraw.selectRegion( null )
          var promiseArray = [];
          var savedSections = "Saving sections: ";

          var prepareRegionForDB = (re) => 
              ({
                  path : JSON.parse(re.path.exportJSON()),
                  name : re.name,
                  annotationID : re.annotationID,
                  type : 'Region',
                  fileID : Microdraw.section,
                  hash : Microdraw.annotationHash(re,'Region'),
                  
                  originalRe : re
              })

          var regionHashChanged = (re) => 
               Microdraw.annotationHash(re,'Region') != re.hash
          

          const savingPromise = Object.keys(Microdraw.ImageInfo).map(function(sl) {
              if ((Microdraw.config.multiImageSave === false) && (sl !== Microdraw.currentImage)) {
                  return Promise.resolve([[],[],[],[]]) ;
              }

              var section = Microdraw.ImageInfo[sl];
              var lastSavedStateSection = Microdraw.lastSaveState[sl];

              /* regions that do not currently have annotaitonIDs will be saved */
              const objsTobeSaved = section.Regions
                  .filter(re=>!re.annotationID)
                  .map(prepareRegionForDB)

              const savingObjsPromise = 
                  fetch(dbroot,{
                      method : 'POST',
                      headers : { 'Content-Type' : 'application/json' },
                      body : JSON.stringify({
                          action : "save",
                          annotations : JSON.stringify(objsTobeSaved)
                      })
                  })
                  .then(res=>res.json())
                  .then(json=>{
                      /* successful save results in replacing old hash (undefined) with new hash
                      successful save will populate the annotationID (originally undefined)
                      */
                      objsTobeSaved.forEach(obj=>{
                          obj.originalRe.annotationID = json.find(savedA => savedA.annotation.hash == obj.hash).annotationID
                          obj.originalRe.hash = obj.hash
                      })
                      return Promise.resolve(json)
                  })

              /* regions that do have annotationIDs
              AND the annotaitonIDs existed in lastSAvedStateSection
              will have their hash calculated ...
              if their hash changed, they will be updated */
              /* regardless if they were updated, this operation will also splice out
              the regions that exist in section, and also in lastSavedStateSection */
              const objsTobeUpdated = lastSavedStateSection
                  .filter(historyRe=>
                      section.Regions
                          .filter(re=>re.annotationID)
                          .findIndex(re=> re.annotationID === historyRe.annotationID) >= 0)
                  .filter(regionHashChanged)
                  .map(prepareRegionForDB)
              
              const updateObjsPromise = 
                  fetch(dbroot,{
                      method : 'POST',
                      headers : { 'Content-Type' : 'application/json' },
                      body : JSON.stringify({
                          action : "save",
                          annotations : JSON.stringify(objsTobeUpdated)
                      })
                  })
                  .then(res=>res.json())
                  .then(json=>{
                      /* successful save results in replacing old hash with new hash */
                      objsTobeUpdated.forEach(obj=>{
                          console.log(obj.originalRe.hash,obj.hash)
                          obj.originalRe.hash = obj.hash
                          console.log(obj.originalRe.hash,obj.hash)
                      })
                      return Promise.resolve(json)
                  })


              /* regions that exist in lastSaveState, but does not exist in Regions, 
              will be deleted */
              const objsTobeDeleted = lastSavedStateSection
                  .filter(historyRe=>
                      section.Regions
                          .filter(re=>re.annotationID)
                          .findIndex(re=> re.annotationID === historyRe.annotationID) < 0)
                  .map(prepareRegionForDB)

              const deleteObjsPromise = 
                  fetch(dbroot,{
                      method : 'POST',
                      headers : { 'Content-Type' : 'application/json' },
                      body : JSON.stringify({
                          action : "delete",
                          annotations : JSON.stringify(objsTobeDeleted)
                      })
                  })
                  .then(res=>res.json())
                  .then(json=>{
                      /* successful deletion does not need to change to the Region array */
                      return Promise.resolve(json)
                  })
                  

              /* region that does not exist in lastSaveState, but exists in Regions will be undeleted
              ...
              or could there be another reason why they might appear? 
              */
              const objsTobeUndeleted = section.Regions
                  .filter(re=>re.annotationID)
                  .filter(re=>
                      lastSavedStateSection
                          .findIndex(historyRe=>historyRe.annotationID===re.annotationID) < 0)
                  .map(prepareRegionForDB)
                  
              const undeleteObjsPromise = 
                  fetch(dbroot,{
                      method : 'POST',
                      headers : { 'Content-Type' : 'application/json' },
                      body : JSON.stringify({
                          action : "undelete",
                          annotations : JSON.stringify(objsTobeUndeleted)
                      })
                  })
                  .then(res=>res.json())
                  .then(json=>{
                      /* successful undeletion does not need to do anything visually */
                      return Promise.resolve(json)
                  })

              return Promise.all([
                  savingObjsPromise,
                  updateObjsPromise,
                  deleteObjsPromise,
                  undeleteObjsPromise
              ])
          });

          /* savingPromise is an array (slice) of array(operation) of array (db jsons) */
          Promise.all(savingPromise)
              .then(arrOfArr=>{
                  //all operations successfully carried out, 

                  const modifiedAnnotations = [0,0,0,0]
                  console.log(arrOfArr)
                  arrOfArr.forEach((arr,sliceIdx)=>arr.forEach((el,opIdx)=>{
                      modifiedAnnotations[opIdx % 4] += el.length
                  }))

                  for(let key in Microdraw.ImageInfo){
                      //make a copy of lastSaveState
                      Microdraw.lastSaveState[key] = Microdraw.ImageInfo[key].Regions.slice(0,Microdraw.ImageInfo[key].Regions.length)
                  }
                  // show dialog box with timeout
                  const saveDialog = `Annotations saved.<br />New : (${modifiedAnnotations[0]})<br />Updated : (${modifiedAnnotations[1]})<br />Deleted : (${modifiedAnnotations[2]})<br />Undeleted : (${modifiedAnnotations[3]})`

                  $('#saveDialog')
                      .html(saveDialog)
                      .fadeIn();
                  setTimeout(function() {
                      $("#saveDialog")
                      .fadeOut(500);
                  }, 5000);
              })
              .catch(e=>{
                  //error in some operations
                  console.log(e)
              })
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

        $.getJSON(dbroot, {
            action: "load_last",
            fileID: Microdraw.section
        }).success(function (data) {
            var i, json, reg;
            Microdraw.annotationLoadingFlag = false;

            // Because of asynchrony, the section that just loaded may not be the one that the user
            // intended to get. If the section that was just loaded does not correspond to the current section,
            // do not display this one and load the current section.
            if( Microdraw.section !== Microdraw.currentImage ) {
                Microdraw.microdrawDBLoad()
                .then(function() {
                    $("#regionList").height($(window).height()-$("#regionList").offset().top);
                    Microdraw.updateRegionList();
                    paper.view.draw();
                });
                resolve("Loaded section does not correspond with the current section.");

                return;
            }

            // if there is no data on the current section just return
            // save hash for the image none the less TODO not needed anymore!
            //if( $.isEmptyObject(data) ) {
            //    Microdraw.ImageInfo[Microdraw.currentImage].Hash = Microdraw.hash(JSON.stringify(Microdraw.ImageInfo[Microdraw.currentImage].Regions)).toString(16);
            //    resolve("No data for the current section");

            //    return;
            //}

            // parse the data and add to the current canvas
            // console.log("[", data, "]");
            //obj = JSON.parse(data);
            //obj = data;
            //if( obj ) {

            /* resolve the promise */
            // for( i = 0; i < data.length; i += 1 ) {
            //     console.log(data[i]);
            //     if ( data[i].type === "Region" ) {
            //         reg = {};
            //         reg.annotationID = data[i].annotationID;
            //         reg.name = data[i].annotation.name;

            //         //reg.page = data[i].annotation.page;
            //         json = data[i].annotation.path;
            //         reg.path = new paper.Path();

            //         /** @todo Remove workaround once paperjs will be fixed */
            //         var {insert} = reg.path.insert;
            //         reg.path.importJSON(json);
            //         reg.path.insert = insert;

            //         Microdraw.newRegion({name:reg.name, path:reg.path, annotationID:reg.annotationID, hash:data[i].annotation.hash});
            //     }
            // }
            // paper.view.draw();
            
            
            for(let key in Microdraw.ImageInfo){
                Microdraw.lastSaveState[key] = Microdraw.ImageInfo[key].Regions.slice(0,Microdraw.ImageInfo[key].Regions.length)
            }
            // if image has no hash, save one
            //Microdraw.ImageInfo[Microdraw.currentImage].Hash = (data.Hash ? data.Hash : Microdraw.hash(JSON.stringify(Microdraw.ImageInfo[Microdraw.currentImage].Regions)).toString(16));

            if( Microdraw.debug ) { console.log("< microdrawDBLoad resolve success. Number of regions:", Microdraw.ImageInfo[Microdraw.currentImage].Regions.length); }
            resolve(data);
        })
        .error(function(jqXHR, textStatus, err) {
            console.log("< microdrawDBLoad resolve ERROR: " + textStatus + " " + err);
            Microdraw.annotationLoadingFlag = false;
            reject(err);
        });
            
    })
}