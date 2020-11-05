class WhaleexEOSIdentity {
  constructor(account, publicKey) {
    this.hash = '28012c3832f5bed4624c4ac7e9a6beebd9246de9e6ee58388ba463091b6703b2';
    this.publicKey = publicKey;
    this.name = account;
    this.accounts = [
      {
        name: account,
        authority: 'active',
        blockchain: 'eos',
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

  installEOS(account, publicKey) {
    this.isEOSInstall = true;
    this.eos = new WhaleexEOSIdentity(account, publicKey);
  }

  uninstallEOS() {
    this.isEOSInstall = false;
    this.eos = null;
  }
}

export default new WhaleexIdentitys();
