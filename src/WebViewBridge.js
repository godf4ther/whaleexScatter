/* global window */

import WhaleexIdentitys from './WhaleexIdentitys';

const genId = () => (Date.now() * 100 + Math.floor(Math.random() * 100)).toString(32);

export default class WebViewBridge {
  static sendAsync(payload) {
    payload.id = payload.id || genId();
    return new Promise((resolve, reject) => {
      WebViewBridge.callbacks.set(payload.id, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });

      switch (payload.type) {
        case 'requestSignature':
          return WebViewBridge.postMessage('eos_signTransaction', payload.id, payload.payload.transaction);
        case 'requestArbitrarySignature':
          return WebViewBridge.postMessage('eos_signMessage', payload.id, payload.payload);
        case 'getOrRequestIdentity':
        case 'identityFromPermissions':
        case 'authenticate': {
          return WebViewBridge.sendResponse(payload.id, WhaleexIdentitys.eos);
        }
        case 'forgetIdentity':
        case 'requestAddNetwork':
          return WebViewBridge.sendResponse(payload.id, true);
        case 'getVersion':
          return WebViewBridge.sendResponse(payload.id, '9.6.0');
        case 'getPublicKey': {
          return WebViewBridge.sendResponse(payload.id, WhaleexIdentitys.eos.publicKey);
        }
        case 'linkAccount':
        case 'hasAccountFor':
        case 'requestTransfer':
        case 'createTransaction':
          // all resolve to false
          return WebViewBridge.sendResponse(payload.id, false);
        default:
          return WebViewBridge.sendError(payload.id, new Error('unknow method'));
      }
    });
  }

  static requestAccountSuccess(id, result) {
    const { account, publicKey } = result;
    WhaleexIdentitys.initEOS(account, publicKey);
    const callback = WebViewBridge.callbacks.get(id);
    if (callback) {
      callback(null, WhaleexIdentitys.eos);
      WebViewBridge.callbacks.delete(id);
    }
  }

  static sendResponse(id, result) {
    const callback = WebViewBridge.callbacks.get(id);
    if (callback) {
      callback(null, result);
      WebViewBridge.callbacks.delete(id);
    }
  }

  static sendError(id, error) {
    const callback = WebViewBridge.callbacks.get(id);
    if (callback) {
      callback(error instanceof Error ? error : new Error(error), null);
      WebViewBridge.callbacks.delete(id);
    }
  }

  static postMessage(method, id, params) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'ScatterRequest',
        payload: {
          id,
          method,
          params,
        },
      })
    );
  }
}

WebViewBridge.callbacks = new Map();
