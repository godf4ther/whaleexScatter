/* global window */

import PluginRepository from './PluginRepository';
import WebViewBridge from './WebViewBridge';
import WhaleexEOS from './WhaleexEOS';
import WhaleexIdentitys from './WhaleexIdentitys';

const checkForExtension = (resolve, tries = 0) => {
  if (tries > 20) {
    return;
  }
  if (window.scatter.isExtension) {
    resolve(true);
    return;
  }
  setTimeout(() => checkForExtension(resolve, tries + 1), 100);
};

export default class WhaleexScatter {
  constructor() {
    this.callbacks = new Map();
    this.isExtension = true;
    this.identity = null;
  }

  loadPlugin(plugin) {
    const noIdFunc = () => {
      if (!this.identity) throw new Error('No Identity');
    };

    if (!plugin.isValid()) {
      throw new Error(`${plugin.name} doesn't seem to be a valid ScatterJS plugin.`);
    }

    PluginRepository.loadPlugin(plugin);

    if (plugin.isSignatureProvider()) {
      this[plugin.name] = plugin.signatureProvider(noIdFunc, () => this.identity);
      this[`${plugin.name}Hook`] = plugin.hookProvider;
    }
  }

  async isInstalled() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(false);
      }, 10000);

      checkForExtension(resolve);
    });
  }

  async connect(pluginName, options) {
    return new Promise(resolve => {
      if (!pluginName || !pluginName.length) {
        throw new Error('You must specify a name for this connection');
      }

      options = Object.assign({ initTimeout: 10000, linkTimeout: 30000 }, options);

      setTimeout(() => {
        resolve(false);
      }, options.initTimeout);

      checkForExtension(resolve);
    });
  }

  disconnect() {
    return true;
  }

  isConnected() {
    return true;
  }

  isPaired() {
    return true;
  }

  getVersion() {
    return WebViewBridge.sendAsync({
      type: 'getVersion',
      payload: {},
    });
  }

  login(requiredFields) {
    return WebViewBridge.sendAsync({
      type: 'getOrRequestIdentity',
      payload: {
        fields: requiredFields,
      },
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  checkLogin() {
    return WebViewBridge.sendAsync({
      type: 'identityFromPermissions',
      payload: {},
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  logout() {
    return WebViewBridge.sendAsync({
      type: 'forgetIdentity',
      payload: {},
    }).then(res => {
      this.identity = null;
      return res;
    });
  }

  getIdentity(requiredFields) {
    return WebViewBridge.sendAsync({
      type: 'getOrRequestIdentity',
      payload: {
        fields: requiredFields,
      },
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  getIdentityFromPermissions() {
    return WebViewBridge.sendAsync({
      type: 'identityFromPermissions',
      payload: {},
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  forgetIdentity() {
    return WebViewBridge.sendAsync({
      type: 'forgetIdentity',
      payload: {},
    }).then(res => {
      this.identity = null;
      return res;
    });
  }

  authenticate(nonce) {
    return WebViewBridge.sendAsync({
      type: 'authenticate',
      payload: { nonce },
    });
  }

  getArbitrarySignature(publicKey, data, whatfor = '', isHash = false) {
    return WebViewBridge.sendAsync({
      type: 'requestArbitrarySignature',
      payload: {
        publicKey,
        data,
        whatfor,
        isHash,
      },
    });
  }

  getPublicKey(blockchain) {
    return WebViewBridge.sendAsync({
      type: 'getPublicKey',
      payload: { blockchain },
    });
  }

  linkAccount(publicKey, network) {
    return WebViewBridge.sendAsync({
      type: 'linkAccount',
      payload: { publicKey, network },
    });
  }

  hasAccountFor(network) {
    return WebViewBridge.sendAsync({
      type: 'hasAccountFor',
      payload: {
        network,
      },
    });
  }

  suggestNetwork(network) {
    return WebViewBridge.sendAsync({
      type: 'requestAddNetwork',
      payload: {
        network,
      },
    });
  }

  requestTransfer(network, to, amount, options = {}) {
    const payload = { network, to, amount, options };
    return WebViewBridge.sendAsync({
      type: 'requestTransfer',
      payload,
    });
  }

  requestSignature(payload) {
    return WebViewBridge.sendAsync({
      type: 'requestSignature',
      payload,
    });
  }

  createTransaction(blockchain, actions, account, network) {
    return WebViewBridge.sendAsync({
      type: 'createTransaction',
      payload: {
        blockchain,
        actions,
        account,
        network,
      },
    });
  }
}

window.WhaleexScatter = WhaleexScatter;
window.WhaleexEOS = WhaleexEOS;
window.WebViewBridge = WebViewBridge;
window.WhaleexIdentitys = WhaleexIdentitys;
