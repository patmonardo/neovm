import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { UserInfoVisitor } from "./UserInfoVisitor";

/**
 * Enhanced UserInfoLoader using Papa Parse.
 * Supports both single and multi-user scenarios.
 * Provides detailed debugging capabilities for GDS development.
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
   * Load user info - backward compatible method.
   * Returns the first username found (for existing code compatibility).
   */
  load(): string {
    const users = this.loadAll();
    if (users.length === 0) {
      throw new Error("No users found in user info file");
    }
    return users[0].userName;
  }

  /**
   * 🚀 Load all users with Papa Parse.
   * Returns array of user information objects.
   */
  loadAll(): UserInfo[] {
    try {
      if (!fs.existsSync(this.userInfoFilePath)) {
        throw new Error(`User info file not found: ${this.userInfoFilePath}`);
      }

      const csvContent = fs.readFileSync(this.userInfoFilePath, "utf8");

      const result = Papa.parse(csvContent, {
        header: true,                    // Use first row as headers
        skipEmptyLines: true,            // Skip empty lines
        transform: (value) => value.trim(), // Trim all values
        dynamicTyping: false,            // Keep all as strings for now
      });

      if (result.errors.length > 0) {
        console.warn(`CSV parsing errors in ${this.userInfoFilePath}:`, result.errors);
      }

      const users = result.data as UserInfo[];

      // Validate user data
      users.forEach((user, index) => {
        if (!user.userName || user.userName.trim() === '') {
          throw new Error(`Invalid or missing userName at row ${index + 2}`); // +2 for header
        }
      });

      return users;

    } catch (error) {
      throw new Error(`Failed to load user info from ${this.userInfoFilePath}: ${error}`);
    }
  }

  /**
   * 🔍 Find specific user by username.
   */
  findUser(userName: string): UserInfo | null {
    const users = this.loadAll();
    return users.find(user => user.userName === userName) || null;
  }

  /**
   * 📊 Get total user count.
   */
  getUserCount(): number {
    return this.loadAll().length;
  }

  /**
   * 👥 Get all usernames as array.
   */
  getAllUsernames(): string[] {
    return this.loadAll().map(user => user.userName);
  }

  /**
   * 🎯 Get users by role.
   */
  getUsersByRole(role: string): UserInfo[] {
    return this.loadAll().filter(user => user.role === role);
  }

  /**
   * ⚡ Get users by permissions.
   */
  getUsersByPermissions(permissions: string): UserInfo[] {
    return this.loadAll().filter(user => user.permissions === permissions);
  }

  /**
   * 🧪 Debug method for GDS development tools.
   * Provides detailed inspection of user info file structure and content.
   */
  debug(): void {
    console.log("👤 === UserInfoLoader Debug Report ===");

    try {
      console.log(`📁 File path: ${this.userInfoFilePath}`);
      console.log(`📄 File exists: ${fs.existsSync(this.userInfoFilePath)}`);

      if (!fs.existsSync(this.userInfoFilePath)) {
        console.log("❌ Cannot debug - file does not exist");
        return;
      }

      // Raw file content analysis
      const rawContent = fs.readFileSync(this.userInfoFilePath, "utf8");
      console.log(`📏 File size: ${rawContent.length} characters`);
      console.log(`📄 Raw content: "${rawContent}"`);

      // Papa Parse analysis
      console.log("🎯 Papa Parse Analysis:");
      const result = Papa.parse(rawContent, {
        header: true,
        skipEmptyLines: true,
      });

      console.log(`📊 Parsed rows: ${result.data.length}`);
      console.log(`📋 Headers: ${result.meta.fields?.join(', ') || 'none'}`);
      console.log(`⚠️ Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        result.errors.forEach((error, index) => {
          console.log(`  Error ${index + 1}: ${error.message} (row: ${error.row})`);
        });
      }

      // Data structure analysis
      if (result.data.length > 0) {
        console.log("📊 Users:");
        (result.data as UserInfo[]).forEach((user, index) => {
          console.log(`  [${index}]: ${JSON.stringify(user)}`);
        });
      }

      // Compatibility test
      console.log("🔄 Compatibility Test:");
      try {
        const loadedUsers = this.loadAll();
        const singleUser = this.load();
        console.log(`✅ loadAll(): ${loadedUsers.length} users`);
        console.log(`✅ load(): "${singleUser}"`);
        console.log(`✅ getUserCount(): ${this.getUserCount()}`);
        console.log(`✅ getAllUsernames(): [${this.getAllUsernames().join(', ')}]`);

        // Test role-based queries
        const admins = this.getUsersByRole('admin');
        const developers = this.getUsersByRole('developer');
        console.log(`✅ getUsersByRole('admin'): ${admins.length} users`);
        console.log(`✅ getUsersByRole('developer'): ${developers.length} users`);

      } catch (error) {
        console.log(`❌ Compatibility test failed: ${(error as Error).message}`);
      }

    } catch (error) {
      console.log(`❌ Debug failed: ${(error as Error).message}`);
    }

    console.log("👤 === End UserInfoLoader Debug ===\n");
  }
}

/**
 * 🧩 User information interface.
 * Extensible for additional user properties in GDS systems.
 */
export interface UserInfo {
  userName: string;
  email?: string;
  role?: string;
  permissions?: string;
  department?: string;
  lastLogin?: string;
  preferences?: string;
  graphAccess?: string;
  apiKey?: string;
}
