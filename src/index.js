/* global window */

import PluginRepository from './PluginRepository';
import EOSBridge from './EOSBridge';
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
      this[plugin.name + 'Hook'] = plugin.hookProvider;
      if (typeof plugin.multiHook === 'function') this[plugin.name + 'MultiHook'] = plugin.multiHook;
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
    return EOSBridge.sendAsync({
      type: 'getVersion',
      payload: {},
    });
  }

  login(requiredFields) {
    return EOSBridge.sendAsync({
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
    return EOSBridge.sendAsync({
      type: 'identityFromPermissions',
      payload: {},
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  logout() {
    return EOSBridge.sendAsync({
      type: 'forgetIdentity',
      payload: {},
    }).then(res => {
      this.identity = null;
      return res;
    });
  }

  useIdentity() {}

  getIdentity(requiredFields) {
    return EOSBridge.sendAsync({
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
    return EOSBridge.sendAsync({
      type: 'identityFromPermissions',
      payload: {},
    }).then(id => {
      if (id) this.identity = id;
      return id;
    });
  }

  forgetIdentity() {
    return EOSBridge.sendAsync({
      type: 'forgetIdentity',
      payload: {},
    }).then(res => {
      this.identity = null;
      return res;
    });
  }

  authenticate(nonce) {
    return EOSBridge.sendAsync({
      type: 'authenticate',
      payload: { nonce },
    });
  }

  getArbitrarySignature(publicKey, data, whatfor = '', isHash = false) {
    return EOSBridge.sendAsync({
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
    return EOSBridge.sendAsync({
      type: 'getPublicKey',
      payload: { blockchain },
    });
  }

  linkAccount(publicKey, network) {
    return EOSBridge.sendAsync({
      type: 'linkAccount',
      payload: { publicKey, network },
    });
  }

  hasAccountFor(network) {
    return EOSBridge.sendAsync({
      type: 'hasAccountFor',
      payload: {
        network,
      },
    });
  }

  suggestNetwork(network) {
    return EOSBridge.sendAsync({
      type: 'requestAddNetwork',
      payload: {
        network,
      },
    });
  }

  requestTransfer(network, to, amount, options = {}) {
    const payload = { network, to, amount, options };
    return EOSBridge.sendAsync({
      type: 'requestTransfer',
      payload,
    });
  }

  requestSignature(payload) {
    return EOSBridge.sendAsync({
      type: 'requestSignature',
      payload,
    });
  }

  createTransaction(blockchain, actions, account, network) {
    return EOSBridge.sendAsync({
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
window.EOSBridge = EOSBridge;
window.WhaleexIdentitys = WhaleexIdentitys;
