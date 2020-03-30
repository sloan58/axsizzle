const axios = require('axios')
const https = require('https')
const parser = require('xml2json')
const builder = require('xmlbuilder')

class AxSizzle {
  constructor(ucm) {
    this.ucm = ucm
    this.soapXml = ''

    let auth = Buffer.from(`${this.ucm.user}:${this.ucm.password}`).toString(
      'base64'
    )

    this.client = axios.create({
      baseURL: `https://${this.ucm.ip}:8443/axl/`,
      timeout: 10000,
      headers: {
        SOAPAction: `"CUCM:DB ver=${this.ucm.version} `,
        Authorization: `Basic ${auth}`,
        'Content-Type': 'text/xml; charset=utf-8'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })

    this.loop = 0
    this.skip = 0
    this.totalRows = 0
    this.iterations = 0
    this.throttling = false
    this.suggestedRows = 0
  }

  buildRequest = ({ method, body }) => {
    this.client.defaults.headers.SOAPAction += `${method}"`

    this.soapXml = builder
      .create(
        {
          'SOAP-ENV:Envelope': {
            '@xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
            '@xmlns:ns1': `http://www.cisco.com/AXL/API/${this.ucm.version}`,
            'SOAP-ENV:Body': {
              [`ns1:${method}`]: body
            }
          }
        },
        { encoding: 'utf-8' }
      )
      .end({ pretty: true })
  }

  callApi = message => {
    this.buildRequest(message)

    return new Promise((resolve, reject) => {
      this.client
        .post('/', this.soapXml)
        .then(response => {
          resolve(this.parseResponse(message.method, response.data))
        })
        .catch(error => {
          if (error.response) {
            console.log(error.response.data)
            console.log(error.response.status)
            console.log(error.response.headers)
            reject(error.response.data)
          } else if (error.request) {
            reject(error.request)
          } else {
            reject('Error', error.message)
          }
          // console.log(error.config)
        })
    })
  }

  parseResponse = (method, response) => {
    return parser.toJson(response, {
      trim: true,
      object: true,
      sanitize: true
    })['soapenv:Envelope']['soapenv:Body'][`ns:${method}Response`].return
  }
}

module.exports = AxSizzle
