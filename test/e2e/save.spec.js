const assert = require('assert')
const db = require('../../app/db/db')()

describe('mocha works', () => {
    it('mocha works', () => {
        assert(true)
    })
})

describe('annotation saved by puppeteer can be retrieved', () => {
    after(() => {
        db.db.close()
    })
    it('works', (done) => {

        db.findAnnotations({
            user: 'anonymous'
        }).then(annotations => {
            annotations.forEach(a => {
                const path = a && a.annotation && a.annotation.path
                const segments = path[1].segments
                if (segments) {
                    segments.forEach(s => {
                        assert(Array.isArray(s))
                    })
                } else {
                    assert(false)
                }
            })
            done()
        }).catch(e => {
            console.log(e)
            done(e)
        })
    })
})
