import Plugin from './Plugin';
import Network from './Network';
import { Blockchains } from './Blockchains';
import * as PluginTypes from './PluginTypes';
import EOSBridge from './EOSBridge';

// const ProxyPolyfill = require('./proxyPolyfill');

// const proxy = (dummy, handler) => new ProxyPolyfill(dummy, handler);

const proxy = (dummy, handler) => new Proxy(dummy, handler);

export default class WhaleexEOS extends Plugin {
  constructor() {
    super(Blockchains.EOS, PluginTypes.BLOCKCHAIN_SUPPORT);
    this.isEosjs2 = false;
  }

  hookProvider(network, fieldsFetcher = null) {
    if (this.isEosjs2) {
      network = Network.fromJson(network);

      return {
        requiredFields: {},
        getAvailableKeys: async () => {
          return await EOSBridge.sendAsync({
            type: 'identityFromPermissions',
            payload: {},
          }).then(id => {
            if (!id) return [];
            return id.accounts.filter(x => x.blockchain === Blockchains.EOS).map(x => x.publicKey);
          });
        },

        sign: async signargs => {
          const requiredFields = fieldsFetcher ? fieldsFetcher() : {};
          signargs.serializedTransaction = Buffer.from(signargs.serializedTransaction).toString('hex');
          return new Promise(async (resolve, reject) => {
            EOSBridge.sendAsync({
              type: 'requestSignature',
              payload: { transaction: signargs, blockchain: Blockchains.EOS, network, requiredFields },
            })
              .then(x => {
                resolve({
                  signatures: x.signatures,
                  serializedTransaction: Buffer.from(signargs.serializedTransaction, 'hex'),
                });
              })
              .catch(x => reject(x));
          });
        },
      };
    } else {
      return signargs => {
        return new Promise((resolve, reject) => {
          const payload = Object.assign(signargs, { blockchain: Blockchains.EOS, network, requiredFields: {} });
          EOSBridge.sendAsync({
            type: 'requestSignature',
            payload,
          })
            .then(x => resolve(x.signatures))
            .catch(x => reject(x));
        });
      };
    }
  }

  multiHook(network, signers) {
    const scatterSigner = this.eosHook(network);

    if (!Array.isArray(signers)) signers = [signers];

    return {
      getAvailableKeys: async () => {
        try {
          const scatterKeys = await scatterSigner.getAvailableKeys();

          let otherKeys = [];
          await Promise.all(
            signers.map(async signer => {
              await signer.getAvailableKeys().then(keys => {
                keys.map(key => otherKeys.push(key));
              });
              return true;
            })
          );

          return scatterKeys.concat(otherKeys);
        } catch (e) {
          throw new Error(e);
        }
      },

      sign: async signargs => {
        try {
          const serializedTransaction = Buffer.from(signargs.serializedTransaction, 'hex');

          const individualSignArgs = async provider => ({
            abis: signargs.abis,
            chainId: network.chainId,
            requiredKeys: await provider.getAvailableKeys(),
            serializedTransaction,
          });

          const pullOutSignatures = result => {
            if (typeof result === 'object' && result.hasOwnProperty('signatures')) return result.signatures;
            return result;
          };

          const scatterSigs = await scatterSigner
            .sign(await individualSignArgs(scatterSigner))
            .then(x => pullOutSignatures(x));

          let otherSigs = [];
          await Promise.all(
            signers.map(async signer => {
              await signer.sign(await individualSignArgs(signer)).then(result => {
                pullOutSignatures(result).map(sig => otherSigs.push(sig));
              });
              return true;
            })
          );

          return {
            signatures: scatterSigs.concat(otherSigs),
            serializedTransaction,
          };
        } catch (e) {
          throw new Error(e);
        }
      },
    };
  }

  signatureProvider(...args) {
    const throwIfNoIdentity = args[0];

    return (network, _eos, _options = {}) => {
      if (!!_options && typeof _options === 'object' && !!_options.rpc) {
        this.isEosjs2 = true;
        network = Network.fromJson(network);

        let requiredFields = {};
        const fieldsFetcher = () => requiredFields;
        const signatureProvider = this.hookProvider(network, fieldsFetcher);

        // The proxy stands between the eosjs object and scatter.
        // This is used to add special functionality like adding `requiredFields` arrays to transactions
        return proxy(new _eos(Object.assign(_options, { signatureProvider })), {
          get(eosInstance, method) {
            return (...args) => {
              if (typeof eosInstance[method] === 'undefined') {
                throw new Error(`${method} does not exist on the eosjs.Api() object.`);
              }

              const rqf = args.find(arg => arg.hasOwnProperty('requiredFields'));
              requiredFields = rqf ? rqf.requiredFields : {};
              return eosInstance[method](...args);
            };
          },
        }); // Proxy
      } else {
        network = Network.fromJson(network);

        const chainId =
          network.hasOwnProperty('chainId') && network.chainId.length ? network.chainId : _options.chainId;

        let prov,
          proxyProvider = async args => prov(args);
        return proxy(_eos({ httpEndpoint: network.fullhost(), chainId, signProvider: proxyProvider }), {
          get(instance, method) {
            if (typeof instance[method] !== 'function') return instance[method];

            let returnedFields = null;
            return (...args) => {
              if (args.find(arg => arg.hasOwnProperty('keyProvider'))) throw Error.usedKeyProvider();

              prov = async signargs => {
                throwIfNoIdentity();

                const requiredFields = args.find(arg => arg.hasOwnProperty('requiredFields')) || { requiredFields: {} };
                const payload = Object.assign(signargs, {
                  blockchain: Blockchains.EOS,
                  network,
                  requiredFields: requiredFields.requiredFields,
                });
                const result = await EOSBridge.sendAsync({ type: 'requestSignature', payload });

                // No signature
                if (!result) return null;

                if (result.hasOwnProperty('signatures')) {
                  returnedFields = result.returnedFields;
                  let multiSigKeyProvider = args.find(arg => arg.hasOwnProperty('signProvider'));
                  if (multiSigKeyProvider)
                    result.signatures.push(multiSigKeyProvider.signProvider(signargs.buf, signargs.sign));
                  return result.signatures;
                }

                return result;
              };

              return new Promise((resolve, reject) => {
                instance[method](...args)
                  .then(result => {
                    if (!result.hasOwnProperty('fc')) return resolve(Object.assign(result, { returnedFields }));

                    // This is a contract
                    resolve(
                      proxy(result, {
                        get(instance, method) {
                          if (method === 'then') return instance[method];
                          return (...args) => {
                            return new Promise(async (res, rej) => {
                              instance[method](...args)
                                .then(actionResult => {
                                  res(Object.assign(actionResult, { returnedFields }));
                                })
                                .catch(rej);
                            });
                          };
                        },
                      })
                    );
                  })
                  .catch(reject);
              });
            };
          },
        }); // Proxy
      }
    };
  }
}
