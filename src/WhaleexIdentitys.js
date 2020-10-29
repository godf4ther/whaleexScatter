class WhaleexEOSIdentity {
  constructor(account, publicKey) {
    this.hash = '28012c3832f5bed4624c4ac7e9a6beebd9246de9e6ee58388ba463091b6703b2';
    this.publicKey = publicKey;
    this.name = account;
    this.accounts = [
      {
        name: account,
        authority: 'active',
        blockchain: 'eos'
      }
    ];
    this.kyc = false;
  }
}

export default class WhaleexIdentitys {
  static initEOS(account, publicKey) {
    WhaleexIdentitys.eos = new WhaleexEOSIdentity(account, publicKey);
  }
}

WhaleexIdentitys.eos = null;
WhaleexIdentitys.eth = null;
WhaleexIdentitys.trx = null;
