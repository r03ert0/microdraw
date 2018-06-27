
module.exports = (app) =>{
    app.get('/getTile',function (req,res){
        fetch(req.query.source)
            .then(img=>img.body.pipe(res))
            .catch(e=>{
                console.log('getTile api broken',e);
                res.status(500)
            });
    })

    app.get('/getJson',function (req,res) {
        const { source } = req.query;

        const thisHostname = req.protocol + '://' + req.get('host')
        console.log('this host name',thisHostname)
        const sourceHostname = 
            !source ? 
                null : 
                (new RegExp('^http')).test(source) ? 
                    url.parse(source).protocol + '//' + url.parse(source).host : 
                    req.protocol + '://' + req.hostname;
        const sourcePath = url.parse(source).path ? url.parse(source).path : null;
        (new Promise((resolve,reject)=>{
            if( sourceHostname && sourcePath ){
                fetch(sourceHostname + sourcePath)
                    .then(data=>resolve(data))
                    .catch(e=>reject(e));
            }else{
                reject('sourceurl not defined');
            }
        }))
            .then(data=>data.json())
            .then(json=>{
                json.tileSources = json.tileSources.map(tileSource=>(new RegExp('^http')).test(tileSource) ? tileSource : tileSource[0] == '/' ? thisHostname + '/getTile?source=' + sourceHostname + tileSource : thisHostname + '/getTile?source=' + sourceHostname +  '/'+ tileSource );
                res.status(200).send(JSON.stringify(json));
            })  
            .catch(e=>{
                console.log('error'+e)
                res.status(404);
            })
    })
}