const { expect } = require('chai')
const { DRAWPOLYGON, NEXT } = require('../UI')

const pptr = require('puppeteer')
let browser

const delay = ms => new Promise(rs => {
  setTimeout(rs, ms)
})

describe('microdraw.js', () => {
  beforeEach(async () => {
    browser = await pptr.launch({headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  })
  afterEach(async () => {
    await browser && browser.close()
  })
  describe('behaviour of paperjs regions on image transition', () => {
    let page
    beforeEach(async () => {
      page = await browser.newPage()
      await page.goto('http://localhost:3000/data?source=/test_data/cat.json&slice=0', { waitUntil: 'networkidle2' })
      await delay(100)
    })

    afterEach(async () => {
      await page.close()
    })
    it('should deselect region on page transition', async () => {

      // n.b. evaluate can only return serializable objects
      const ImageInfo1 = await page.evaluate(`Microdraw['ImageInfo']`)
      
      expect(ImageInfo1['1'].Regions.length).to.be.equal(0)
      expect(ImageInfo1['0'].Regions.length).to.be.equal(0)

      await page.click(DRAWPOLYGON)

      await page.mouse.click(400, 400)
      await page.mouse.click(500, 400)
      await page.mouse.click(500, 500)
      await page.mouse.click(400, 500)
      await page.mouse.click(400, 400)

      const ImageInfo2 = await page.evaluate(() => {
        // IIEF avoiding poisoning global scope
        return (() => {

          const returnObj = {}
          for (const key in Microdraw.ImageInfo){
            const { Regions, ...rest } = Microdraw.ImageInfo[key]
            returnObj[key] = {
              ...rest,
              Regions: Regions.map(region => region.path.exportJSON())
            }
          }
  
          return Promise.resolve(returnObj)
        })()
      })

      expect(ImageInfo2['1'].Regions.length).to.be.equal(0)
      expect(ImageInfo2['0'].Regions.length).to.be.equal(1)
      const regionJson = JSON.parse(ImageInfo2['0'].Regions[0])
      expect(regionJson[1]['selected']).to.be.equal(true)

      // go to next page

      await page.click(NEXT)
      await delay(500)

      const newUrl = page.url()
      expect(newUrl).to.contain('slice=1')

      const ImageInfo3 = await page.evaluate(() => {
        // IIEF avoiding poisoning global scope
        return (() => {

          const returnObj = {}
          for (const key in Microdraw.ImageInfo){
            const { Regions, ...rest } = Microdraw.ImageInfo[key]
            returnObj[key] = {
              ...rest,
              Regions: Regions.map(region => region.path.exportJSON())
            }
          }
  
          return Promise.resolve(returnObj)
        })()
      })

      expect(ImageInfo3['1'].Regions.length).to.be.equal(0)
      expect(ImageInfo3['0'].Regions.length).to.be.equal(1)
      const regionJsonAfter = JSON.parse(ImageInfo3['0'].Regions[0])
      expect(!!regionJsonAfter[1]['selected']).to.be.equal(false)

    })
  })
})