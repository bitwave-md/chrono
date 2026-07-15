export interface EmailTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export class EmailServerConfiguration {
  private readonly connectionUrl: URL;

  private constructor(connectionUrl: URL) {
    this.connectionUrl = connectionUrl;
  }

  static from(connectionString: string): EmailServerConfiguration {
    let connectionUrl: URL;

    try {
      connectionUrl = new URL(connectionString);
    } catch {
      throw new Error("EMAIL_SERVER must be a valid smtp:// or smtps:// URL.");
    }

    if (connectionUrl.protocol !== "smtp:" && connectionUrl.protocol !== "smtps:") {
      throw new Error("EMAIL_SERVER must use the smtp:// or smtps:// protocol.");
    }

    if (!connectionUrl.hostname) {
      throw new Error("EMAIL_SERVER must include an SMTP hostname.");
    }

    return new EmailServerConfiguration(connectionUrl);
  }

  toTransportOptions(): EmailTransportOptions {
    const secure = this.connectionUrl.protocol === "smtps:";
    const options: EmailTransportOptions = {
      host: this.connectionUrl.hostname,
      port: this.connectionUrl.port
        ? Number.parseInt(this.connectionUrl.port, 10)
        : secure
          ? 465
          : 587,
      secure,
    };

    if (this.connectionUrl.username || this.connectionUrl.password) {
      options.auth = {
        user: decodeURIComponent(this.connectionUrl.username),
        pass: decodeURIComponent(this.connectionUrl.password),
      };
    }

    return options;
  }
}
