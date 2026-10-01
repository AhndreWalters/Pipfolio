'use strict';

const enc=new TextEncoder();
const dec=new TextDecoder();

const b64=bytes=>{
  let binary='';
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);

  for(let i=0;i<data.length;i+=0x8000){
    binary+=String.fromCharCode(...data.subarray(i,i+0x8000));
  }

  return btoa(binary);
};

const unb=value=>{
  if(typeof value!=='string'||!value)return new Uint8Array();

  const binary=atob(value);
  const bytes=new Uint8Array(binary.length);

  for(let i=0;i<binary.length;i++){
    bytes[i]=binary.charCodeAt(i);
  }

  return bytes;
};

const webCrypto=()=>{
  if(!globalThis.crypto?.subtle){
    throw new Error('Web Crypto API is unavailable. Use HTTPS or localhost.');
  }

  return globalThis.crypto;
};

async function dk(password,salt){
  if(typeof password!=='string'||!password){
    throw new Error('A password is required.');
  }

  if(!(salt instanceof Uint8Array)||salt.length<16){
    throw new Error('Invalid encryption salt.');
  }

  const cryptoApi=webCrypto();

  const material=await cryptoApi.subtle.importKey(
    'raw',
    enc.encode(password),
    {
      name:'PBKDF2'
    },
    false,
    ['deriveKey']
  );

  return cryptoApi.subtle.deriveKey(
    {
      name:'PBKDF2',
      salt,
      iterations:250000,
      hash:'SHA-256'
    },
    material,
    {
      name:'AES-GCM',
      length:256
    },
    false,
    ['encrypt','decrypt']
  );
}

async function encrypt(value,password){
  const cryptoApi=webCrypto();
  const salt=cryptoApi.getRandomValues(new Uint8Array(16));
  const iv=cryptoApi.getRandomValues(new Uint8Array(12));
  const plaintext=enc.encode(JSON.stringify(value));
  const key=await dk(password,salt);
  const ciphertext=await cryptoApi.subtle.encrypt(
    {
      name:'AES-GCM',
      iv,
      tagLength:128
    },
    key,
    plaintext
  );

  return JSON.stringify({
    v:1,
    alg:'AES-GCM',
    kdf:'PBKDF2-SHA-256',
    i:250000,
    s:b64(salt),
    n:b64(iv),
    c:b64(ciphertext)
  });
}

async function decrypt(blob,password){
  if(typeof blob!=='string'||!blob.trim()){
    throw new Error('Invalid encrypted data.');
  }

  let payload;

  try{
    payload=JSON.parse(blob);
  }catch{
    throw new Error('Invalid encrypted data.');
  }

  const salt=unb(payload.s);
  const iv=unb(payload.n||payload.i);
  const ciphertext=unb(payload.c);

  if(
    salt.length<16||
    iv.length!==12||
    ciphertext.length<17
  ){
    throw new Error('Invalid encrypted data.');
  }

  const cryptoApi=webCrypto();
  const key=await dk(password,salt);

  let plaintext;

  try{
    plaintext=await cryptoApi.subtle.decrypt(
      {
        name:'AES-GCM',
        iv,
        tagLength:128
      },
      key,
      ciphertext
    );
  }catch{
    throw new Error('Unable to decrypt data.');
  }

  try{
    return JSON.parse(dec.decode(plaintext));
  }catch{
    throw new Error('Decrypted data is invalid.');
  }
}