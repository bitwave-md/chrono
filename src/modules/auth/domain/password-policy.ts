export interface PasswordRequirement { label: string; valid: boolean }

export class PasswordPolicy {
  static requirements(password: string): PasswordRequirement[] {
    return [
      { label: "12 to 128 characters", valid: password.length >= 12 && password.length <= 128 },
      { label: "one uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "one lowercase letter", valid: /[a-z]/.test(password) },
      { label: "one number", valid: /[0-9]/.test(password) },
      { label: "one ASCII special symbol", valid: /[!-/:-@\[-`\{-~]/.test(password) },
    ];
  }

  static assert(password: string): void {
    if (typeof password !== "string" || this.requirements(password).some((item) => !item.valid)) {
      throw new Error("Password must be 12–128 characters and include uppercase, lowercase, a number, and a special symbol.");
    }
  }
}
