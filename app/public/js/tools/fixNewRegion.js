/*global Microdraw*/
/*global paper*/

var ToolFixNewRegion = {
  fixNewRegion: (function(){
    var fixed = false

    let queryNewName, showInfoModal

    var appendEl = `
<div id = "inputModal" class="modal fade" tabindex="-1" role="dialog">
<div class="modal-dialog" role="document">
  <div class="modal-content">
    <div class="modal-header">
      <h4 class="modal-title">Attaching custom region input complete!</h4>
    </div>
    <div id = "warningInfo" class="modal-body">
      Successfully attached custom region input.
    </div>
    <div id = "listInfo" class = "hidden modal-body">
      <div class = "radioContainer" id = "predefinedContainer">
        <label>
          <input type = "radio" name = "inputType" id = "predefined">
          Artefact: 
        </label>
        <div>
          <span class = "btn btn-default">scratch</span>
          <span class = "btn btn-default">missing</span>
          <span class = "btn btn-default">tear</span>
          <span class = "btn btn-default">detach</span>
          <span class = "btn btn-default">fold</span>
          <span class = "btn btn-default">staining</span>
          <span class = "btn btn-default">crystal</span>
          <span class = "btn btn-default">misc</span>
        </div>
      </div>
      <hr>
      <div class = "radioContainer" id = "customContainer">
        <label>
          <input type = "radio" name = "inputType" id = "customName">
          Region: 
        </label>
        <div>
          <input type = "text" class = "form-control" id = "regionTextInput">
        </div>
      </div>
    </div>
    <div class = "modal-footer hidden">
      <span class = "btn btn-primary">
        Save
      </span>
      <span class = "btn btn-default">
        Cancel
      </span>
    </div>
  </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->
</div><!-- /.modal -->
    `

    var finish = function(){
      $('#inputModal').modal('show')
    }

    var attachDom = function(){
      const container = document.createElement('div')
      container.innerHTML = appendEl
      document.body.appendChild(container)
    }

    var init = function(){
      $(()=>{
        /*  production */
        // if (devFlag){
        //   $('#inputModal').modal('show')
        //   $('#menuBar').css('background-color','rgba(250,100,100,0.5)')
        // }
        
        /* when any part of the container is clicked (including the label, text inputbox or any of the buttons) */
        $('#inputModal #listInfo .radioContainer').click(function(){
          $('#inputModal .radioContainer input[type="radio"]').prop('checked',false)
          $(this).find('input[type="radio"]').prop('checked',true).change()
        })
    
        /* toggle for the predefined boxes */
        $('#inputModal #listInfo span.btn').click(function(){
          $(this).parent().children('span.btn').removeClass('active')
          $(this).addClass('active')
          
          /* for predefined, automatically apply the name */
          /* the reason why requestAnimationFrame is needed here is, we needed to wait for the event to bubble out, eventually set the radio input to the desired one, if the result is to be parsed correctly */
          requestAnimationFrame(()=>
              $('#inputModal .modal-footer .btn-primary').click()
          )
        })
    
        let loadRegionNames = () =>{
          return new Promise((resolve,reject)=>{
              /* send a post request to fetch an array (?) */
            resolve(["stn_l","stn_r","BSTLC_l","BSTLC_r","BSTLD_l","BSTLD_r","BSTLP_l","BSTLP_r","BSTM_l","BSTM_r","V1_l","V1_r","V2_l","V2_r","V3_l","V3_r"])
          })    
        }

        loadRegionNames().then((data)=>{
          new autoComplete({
            selector : '#regionTextInput',
            minChars : 0,
            source : function(term,suggest){
              term = term.toLowerCase()
              suggest(
                data.filter(text=>{
                  const regex = new RegExp(term,'gi')
                  return regex.test(text)
                })
              )
            }
          })
        })
      })
      
      let keyListener = (e) => {
          if(e.which==13) $('#inputModal .modal-footer .btn-primary').click()
      }
      
      showInfoModal = (info)=>{
        modalShowWarning()
        $('#inputModal .modal-title').text('warning')
        $('#inputModal .modal-body#warningInfo').text(info)
        $('#inputModal').modal('show')
      }

      /* patch Microdraw so all can use showInfoModal */
      $.extend(Microdraw,showInfoModal)
      
      let modalInputPromise
      
      queryNewName = (currentValue) => {
        modalShowInput(currentValue)
        
        $('#inputModal').keydown(keyListener)
        modalInputPromise = new Promise((resolve,reject)=>{
          /* clear previous ev listeners */
          $('#inputModal').on('shown.bs.modal',function(){
              $('#inputModal #listInfo input[type="text"]').select()
          })
  
          $('#inputModal').modal('show')
          $('#inputModal .modal-footer .btn-primary').click(function(){
              resolve( findNewName(currentValue) )
              $('#inputModal').modal('hide')
          })
          $('#inputModal .modal-footer .btn-default').click(function(){
              $('#inputModal').modal('hide')
          })
  
          /* may need to remove this ev listener manually ... somewhere */
          $('#inputModal').on('hide.bs.modal',function(){
            resolve(currentValue)
            $('#inputModal').off()
            $('#inputModal .modal-footer .btn').off()
          })
        })
        return modalInputPromise
      }
      
      let findNewName = (currentValue) => {
        let container = $('#inputModal #listInfo input[type="radio"]:checked').parents('.radioContainer')
        if (container.find('span.btn.active').length > 0 ) return container.find('span.btn.active').text()
        if (container.find('input[type="text"]').length > 0) {
          /* if a region name is returned via the input box, remember the said name, and newer, subsequent new regions will be automatically populated with this name */
          if(container.find('input[type="text"]').val() != '') persistentRegionName = container.find('input[type="text"]').val()
          console.log('input type text')
          return container.find('input[type="text"]').val() == '' ? currentValue : container.find('input[type="text"]').val()
        };
        return currentValue
      }
      
      let modalShowInput = (currentValue) =>{
        $('#inputModal .modal-title').text('rename region')
    
        /* reset the modal first */
        $('#inputModal .radioContainer input[type="radio"]').prop('checked',false)
        $('#inputModal #customContainer input[type="radio"]').prop('checked',true)
        $('#inputModal .radioContainer span.btn').removeClass('active')
        $('#inputModal .radioContainer input[type="text"]').val(currentValue)
    
        $('#inputModal #warningInfo').addClass('hidden')
        $('#inputModal #listInfo').removeClass('hidden')
        $('#inputModal .modal-footer').removeClass('hidden')
      }
      
      let modalShowWarning = () =>{
        $('#inputModal #warningInfo').removeClass('hidden')
        $('#inputModal #listInfo').addClass('hidden')
        $('#inputModal .modal-footer').addClass('hidden')
      }
      
      
      window.persistentRegionName
    }

    var fixdoublePressOnRegion = function(){
      Microdraw.doublePressOnRegion = function(event){
          
        if( Microdraw.debug ) console.log("> doublePressOnRegion extended by fixNewRegion.js");

        event.stopPropagation();
        event.preventDefault();

        if( event.clientX > 20 ) {
          if( event.clientX > 50 ) {
            if( Microdraw.config.drawingEnabled ) {
              let id = this.id
              queryNewName(  Microdraw.findRegionByUID(id).name )
                .then((value)=>{
                    Microdraw.changeRegionName( Microdraw.findRegionByUID(id), value);
                })
                .catch((error)=>{
                    /* should not be any errors */
                    showInfoModal(error)
                    console.log(error)
                })
            }   
          }
          else {
              var reg =  Microdraw.findRegionByUID(this.id);
              if( reg.path.fillColor != null ) {
                  if( reg ) {
                  Microdraw.selectRegion(reg);
                  }
                  Microdraw.annotationStyle(reg);
              }
          }
        }
        else {
            var reg =  Microdraw.findRegionByUID(this.id);
            Microdraw.toggleRegion(reg);
        }
      }
    }

    var tool = {

      /*
        * @function click
        * @desc Convert polygon path to bezier curve
        * @param {string} prevTool The previous tool to which the selection goes back
        * @returns {void}
        */
      click: function click(prevTool) {

        if(fixed){
          Microdraw.backToSelect();
          return
        }
        fixed = true;

        console.log('fixing double press on region')

        attachDom()
        init()
        fixdoublePressOnRegion()
        finish()

        Microdraw.backToSelect();
      }
    }
    return tool
  }())
}