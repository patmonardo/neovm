import * as fs from "fs";
import * as path from "path";
import { UserInfoVisitor } from "./UserInfoVisitor";

/**
 * Loader for user information from text files.
 * Loads user info as a simple string from a text file.
 */
export class UserInfoLoader {
  private readonly userInfoFilePath: string;

  constructor(importPath: string) {
    this.userInfoFilePath = path.join(
      importPath,
      UserInfoVisitor.USER_INFO_FILE_NAME
    );
  }

  /**
   * Load user info from file.
   * Returns the file content as a trimmed string.
   */
  load(): string {
    try {
      return fs.readFileSync(this.userInfoFilePath, "utf8").trim();
    } catch (error) {
      throw new Error(
        `Failed to load user info from ${this.userInfoFilePath}: ${error}`
      );
    }
  }
}
