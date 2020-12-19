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
        case 'authenticate': {
          return WebViewBridge.postMessage('eos_signMessage', payload.id, {
            data: payload.payload.nonce,
            whatfor: 'authenticate',
            isHash: false,
          });
        }
        case 'requestTransfer':
          return WebViewBridge.postMessage('eos_sendTransaction', payload.id, payload.payload);
        case 'getOrRequestIdentity':
        case 'identityFromPermissions': {
          if (WhaleexIdentitys.isEOSInstall) {
            return WebViewBridge.sendResponse(payload.id, WhaleexIdentitys.eos);
          } else {
            return WebViewBridge.postMessage('eos_requestAccounts', payload.id);
          }
        }
        case 'forgetIdentity': {
          WhaleexIdentitys.uninstallEOS();
          return WebViewBridge.sendResponse(payload.id, true);
        }
        case 'linkAccount':
        case 'requestAddNetwork':
          return WebViewBridge.sendResponse(payload.id, true);
        case 'getVersion':
          return WebViewBridge.sendResponse(payload.id, '1.0.0');
        case 'getPublicKey': {
          if (WhaleexIdentitys.isEOSInstall) {
            return WebViewBridge.sendResponse(payload.id, WhaleexIdentitys.eos.publicKey);
          } else {
            WebViewBridge.sendError(payload.id, new Error('User rejected the request'));
          }
        }
        case 'hasAccountFor':
        case 'createTransaction':
          // all resolve to false
          return WebViewBridge.sendResponse(payload.id, false);
        default:
          return WebViewBridge.sendError(payload.id, new Error('unknow method'));
      }
    });
  }

  static requestAccountSuccess(id, result) {
    console.log('requestAccountSuccess', result);
    const { account, publicKey, permission } = result;
    WhaleexIdentitys.installEOS(account, publicKey, permission);
    const callback = WebViewBridge.callbacks.get(id);
    if (callback) {
      callback(null, WhaleexIdentitys.eos);
      WebViewBridge.callbacks.delete(id);
    }
  }

  static sendResponse(id, result) {
    console.log('sendResponse', result);
    const callback = WebViewBridge.callbacks.get(id);
    if (callback) {
      callback(null, result);
      WebViewBridge.callbacks.delete(id);
    }
  }

  static sendError(id, error) {
    console.log('sendError', error);
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
