const monk = require('monk')
const MONGODB = process.env.MONGODB || process.env.MONGODB_TEST_DEFAULT || '127.0.0.1:27017/microdraw'

module.exports = function(overwriteMongoPath){
    console.log(`connecting to mongodb at: ${MONGODB}`)
    
    const db = monk(overwriteMongoPath || MONGODB)
    let connected = false

    db.then(() => {
        connected = true
        console.log('connected successfully')
    }).catch((e) => {
        // retry (?)
        connected = false
        console.log('connection error', e)
    })

    /**
     * @returns {boolean} checks mongodb connection
     */
    const checkHealth = () => connected

    /* add user */
    const addUser = (user)=>new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        db.get('users').insert(user)
            .then(()=>resolve(user))
            .catch(e=>reject(e))
    })

    const updateUser = (user)=>new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        db.get('user').update({
            username : user.username
        },{
            $set : user
        }).then(()=>resolve(user))
            .catch(reject)
    })

    /* find user */
    const queryUser = (searchQuery)=>new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        db.get('users').findOne(searchQuery)
            .then((user)=>user ? resolve(user) : reject({message:'error find one user',result:user}))
            .catch(e=>reject(e))
    })

    const upsertUser = (user)=> new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        queryUser({
            username : user.username
        })
            .then(()=>updateUser(user))
            .then(resolve)
            .catch(e=>{
                e.message === 'error find one user' ?
                    addUser(user)
                        .then(resolve)
                        .catch(e=>reject(e)) :
                reject(e)
            })
            
    })

    const queryAllUsers = (pagination)=>new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        db.get('users').find(pagination)
            .then((users)=>users ? resolve(users) : reject({message : 'error find all users',result:users}))
            .catch(e=>reject(e))
    })

    /**
     * 
     * @param {Object} searchQuery having fields: fileID : string, user:string
     * @returns {Promise} to resolve as an array of annotations
     */
    const findAnnotations = (searchQuery)=>new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        db.get('annotations').find(
            Object.assign({},searchQuery,{
                backup : { $exists : false }
            })
        )
            .then((annotations)=>
                annotations ? 
                    resolve(annotations) :
                    resolve([]))
            .catch(e=>reject(e))
    })

    /**
     * 
     * @param {Object} saveQuery having fields : fileID : string, user : string, annotationHash : string, annotation : JSON.stringify(Object { Regions : string[] }), hash : string
     * @returns {Promise} to resolve when saving is complete
     */
    const updateAnnotation = (saveQuery)=> new Promise((resolve,reject)=>{
        if (!checkHealth()) {
            return reject('db connection not healthy')
        }
        const { fileID , user, annotationHash, annotation } = saveQuery
        db.get('annotations').update(
            Object.assign(
                {},
                { fileID , user },
                { backup : { $exists : false } }),
            { $set : { backup : true } },
            { multi : true }
        ).then(()=>{
            const allAnnotation = JSON.parse(annotation)
            const arrayTobeSaved = allAnnotation.Regions.map(region=>({
                fileID, 
                user,
                annotationHash ,
                annotation : region
            }))
            db.get('annotations').insert(arrayTobeSaved)
                .then(()=>resolve())
                .catch(e=>reject(e))
        })
    })

    return {
        addUser,
        queryUser,
        queryAllUsers,
        findAnnotations,
        updateAnnotation,
        updateUser,
        upsertUser,
        db,
        checkHealth
    }
    /* should discourage the use of db.db ... this renders it db specific ... */
}