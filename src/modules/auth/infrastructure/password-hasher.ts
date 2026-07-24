import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export class PasswordHasher {
  static readonly dummyHash = "$argon2id$v=19$m=19456,t=2,p=1$4Dr4WeVlyVWisGnaxF/EXw$d3CDxlVCNlTB3hqbdWtPotfKGZqof83ByawKiSp6peM";

  async hash(password: string): Promise<string> {
    return hash(password, { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1, salt: randomBytes(16), outputLen: 32 });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
