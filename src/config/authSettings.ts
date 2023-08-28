import { ExtensionContext, SecretStorage } from "vscode";

export default class AuthSettings {
  private static _instance: AuthSettings;

  constructor(private secretStorage: SecretStorage) {}

  static init(context: ExtensionContext): void {
    AuthSettings._instance = new AuthSettings(context.secrets);
  }

  static get instance(): AuthSettings {
    return AuthSettings._instance;
  }

  async storeOpenAIToken(token: string): Promise<void> {
    this.secretStorage.store("openai_token", token);
  }

  async getOpenAIToken(): Promise<string | undefined> {
    return await this.secretStorage.get("openai_token");
  }
}
