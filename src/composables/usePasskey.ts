
type UserVerificationRequirement = 'preferred' | 'required' | 'discouraged';

const toBase64url = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const randomChallenge = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

const randomUserId = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));

export async function createPassKey(name: string): Promise<{ id: string }> {
  const displayName = name || `User ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`;

  const options: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: { name: 'TalkFlow' },
    user: {
      id: randomUserId(),
      name: displayName,
      displayName: displayName,
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred' as UserVerificationRequirement,
    },
    attestation: 'none',
    timeout: 60000,
  };

  const credential = (await navigator.credentials.create({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('创建 Passkey 失败');
  }

  const id = toBase64url(credential.rawId);
  return { id };
}

export async function getPassKey(): Promise<{ id: string }> {
  const options: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    userVerification: 'preferred' as UserVerificationRequirement,
    timeout: 60000,
  };

  const credential = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('获取 Passkey 失败');
  }

  const id = toBase64url(credential.rawId);
  return { id };
}