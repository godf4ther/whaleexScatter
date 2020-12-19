class WhaleexEOSIdentity {
  constructor(account, publicKey, permission) {
    this.hash = '28012c3832f5bed4624c4ac7e9a6beebd9246de9e6ee58388ba463091b6703b2';
    this.publicKey = publicKey;
    this.name = account;
    this.accounts = [
      {
        name: account,
        authority: permission,
        blockchain: 'eos',
        publicKey: publicKey,
      },
    ];
    this.kyc = false;
  }
}

class WhaleexIdentitys {
  constructor() {
    this.isEOSInstall = false;
    this.eos = null;
    this.eth = null;
    this.trx = null;
  }

  installEOS(account, publicKey, permission) {
    this.isEOSInstall = true;
    this.eos = new WhaleexEOSIdentity(account, publicKey, permission);
  }

  uninstallEOS() {
    this.isEOSInstall = false;
    this.eos = null;
  }
}

export default new WhaleexIdentitys();
