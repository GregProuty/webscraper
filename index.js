const puppeteer = require('puppeteer')
const htmlparser = require("htmlparser");

var handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
        console.log(error)
    else
        return dom
})

const buildArray = (obj) => {
    let arr = []
    function eachRecursive(obj) {
        for (var k in obj) {
            if (typeof obj[k] == "object" && obj[k] !== null) {
                eachRecursive(obj[k]);
            } else {
                if (k === 'data') {
                    arr.push(obj[k])
                }
            }
        }
    }
    eachRecursive(obj)
    return arr
}

const buildObject = (arr) => {
    let obj = {
        policies: []
    }

    arr.forEach(subArr => {
        obj[subArr[0]] = {}
        if (subArr[0].includes('id:')) {
            let tmp = {}
            for (let i = 1; i < subArr.length; i++) {
                if (subArr[i].includes(':')) {
                    tmp[subArr[i]] = subArr[i+1]
                }
            }
            obj.policies.push(tmp)
        } else {
            for (let i = 1; i < subArr.length; i++) {
                if (subArr[i].includes(':')) {
                    obj[subArr[0]][subArr[i]] = subArr[i+1]
                }
            }
        }
    })
    delete obj['id:']
    return obj
}

const splitElements = arr => {
    let newArr = []
    arr.forEach(str => {
        let newStr = str.trim()
        if (newStr.includes(':') && newStr.split(':')[1].length > 1) {
            newArr.push(newStr.split(':')[0] + ':')
            newArr.push(newStr.split(':')[1])
        } else {
            newArr.push(newStr)
        }
    })
    return newArr
}

const splitTableElements = arr => {
    let newArr = []
    let tmp = arr
    while (tmp.length > 11) {
        newArr.push(tmp.slice(0, 12))
        tmp = tmp.slice(12, tmp.length)
    }
    return newArr
}

const splitByComma = arr => {
    let newArr = []
    let tmp = arr
    while (tmp.includes(',')) {
        const index = tmp.indexOf(',')
        newArr.push(tmp.slice(0,index))
        tmp = tmp.slice(index+1, tmp.length)
    }
    return newArr
}

async function scrapeFirst() {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage()
    let finalData
    await page.goto('https://scraping-interview.onrender.com/mock_indemnity/a0dfjw9a')

    const text = await page.evaluate(() => 
        Array.from(document.querySelectorAll('.card-body, .container'), element => element.innerHTML));
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(text);

        const arr = buildArray(handler.dom)

        const data = splitElements(arr).filter(
            element => 
                !element.includes('class')
                && element !== 'dl'
                && element !== 'span'
                && !element.includes('label')
                && !element.includes('div')
            )
        const array = splitByComma(data)
        finalData = buildObject(array)

    browser.close()
    return finalData
}

async function scrapeSecond() {
    const browser = await puppeteer.launch({})
    const page = await browser.newPage()
    let pageNumber = 1
    let tableHasContent = true

    let finalData
    while (tableHasContent) {
        await page.goto('https://scraping-interview.onrender.com/placeholder_carrier/f02dkl4e/policies/'+ pageNumber)

        const text = await page.evaluate(() => 
            Array.from(document.querySelectorAll('.card-body, .policy-details'), element => element.innerHTML));
            const parser = new htmlparser.Parser(handler);
            parser.parseComplete(text);

            const arr = buildArray(handler.dom)

            const data = splitElements(arr).filter(
                element => 
                    !element.includes('class')
                    && element !== 'dl'
                    && element !== 'span'
                    && !element.includes('label')
                    && !element.includes('div')
                    && !element.includes('td')
                    && !element.includes('br')
                    && !element.includes('h5')
                    && !element.includes('th')
                    && !element.includes('tr')
                    && !element.includes('tfoot')
                )
            if (pageNumber === 1) {
                const array = splitByComma(data)
                finalData = buildObject(array)
            }

            const index = data.indexOf('tbody')
            const rows = data.slice(index+1, data.length-3)

            if (!rows.length) {
                tableHasContent = false
            }

            const rowData = splitTableElements(rows).map(obj => {
                return {
                    id: obj[0],
                    premium: obj[1],
                    status: obj[2],
                    effectiveDate: obj[3],
                    terminationDate: obj[4],
                    lastPaymentDate: obj[7],
                    commisionRate: obj[9],
                    numberOfInsureds: obj[11]
                }
            })
            finalData.policies = finalData.policies.concat(rowData)
            pageNumber++
    }
    browser.close()
    return finalData
}

const print = async func => {
    const data = await func()
    console.log(data)
}

print(scrapeFirst)
print(scrapeSecond)
