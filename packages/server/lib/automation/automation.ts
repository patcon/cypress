import Bluebird from 'bluebird'
import { v4 as uuidv4 } from 'uuid'
import { Cookies } from './cookies'
import { Screenshot } from './screenshot'

interface IMiddleware {
  onPush?: () => void
  onBeforeRequest?: () => void
  onRequest?: () => void
  onResponse?: () => void
  onAfterResponse?: () => void
}

export class Automation {
  private requests: Record<number, (any) => void>
  private middleware: IMiddleware
  private cookies: Cookies
  private screenshot: Screenshot

  constructor (cyNamespace: string, cookieNamespace: string, screenshotsFolder: string) {
    this.requests = {}

    // set the middleware
    this.middleware = this.reset()

    this.cookies = new Cookies(cyNamespace, cookieNamespace)
    this.screenshot = new Screenshot(screenshotsFolder)
  }

  reset () {
    const onPush = this.middleware?.onPush

    this.middleware = {}

    if (onPush) {
      this.middleware.onPush = onPush
    }

    return this.middleware
  }

  automationValve (message, fn) {
    return (msg, data) => {
      // enable us to omit message
      // argument
      if (!data) {
        data = msg
        msg = message
      }

      const onReq = this.get('onRequest')

      // if we have an onRequest function
      // then just invoke that
      if (onReq) {
        return onReq(msg, data)
      }

      // do the default
      return this.requestAutomationResponse(msg, data, fn)
    }
  }

  requestAutomationResponse (message, data, fn) {
    return new Bluebird((resolve, reject) => {
      const id = uuidv4()

      this.requests[id] = function (obj) {
        // normalize the error from automation responses
        const e = obj.__error

        if (e) {
          const err = new Error(e)

          err.name = obj.__name
          err.stack = obj.__stack

          return reject(err)
        }

        // normalize the response
        return resolve(obj.response)
      }

      // callback onAutomate with the right args
      return fn(message, data, id)
    })
  }

  invokeAsync (fn, ...args) {
    return Bluebird
    .try(() => {
      fn = this.get(fn)

      if (fn) {
        return fn(...args)
      }
    })
  }

  normalize (message, data, automate?) {
    return Bluebird.try(() => {
      switch (message) {
        case 'take:screenshot':
          return this.screenshot.capture(data, automate)
        case 'get:cookies':
          return this.cookies.getCookies(data, automate)
        case 'get:cookie':
          return this.cookies.getCookie(data, automate)
        case 'set:cookie':
          return this.cookies.setCookie(data, automate)
        case 'clear:cookies':
          return this.cookies.clearCookies(data, automate)
        case 'clear:cookie':
          return this.cookies.clearCookie(data, automate)
        case 'change:cookie':
          return this.cookies.changeCookie(data)
        default:
          return automate(data)
      }
    })
  }

  getRequests () {
    return this.requests
  }

  get (fn) {
    return this.middleware[fn]
  }

  getMiddleware () {
    return this.middleware
  }

  use (middlewares: IMiddleware) {
    return this.middleware = {
      ...this.middleware,
      ...middlewares,
    }
  }

  push (message: string, data: unknown) {
    return this.normalize(message, data)
    .then((data) => {
      if (data) {
        this.invokeAsync('onPush', message, data)
      }
    })
  }

  request (message, data, fn) {
    // curry in the message + callback function
    // for obtaining the external automation data
    const automate = this.automationValve(message, fn)

    // enable us to tap into before making the request
    return this.invokeAsync('onBeforeRequest', message, data)
    .then(() => {
      return this.normalize(message, data, automate)
    })
    .tap((resp) => {
      return this.invokeAsync('onAfterResponse', message, data, resp)
    })
  }

  response (id, resp) {
    const request = this.requests[id]

    if (request) {
      delete request[id]

      return request(resp)
    }
  }
}
