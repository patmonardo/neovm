/**
 * CATALOG REQUEST - SIMPLE SECURITY CONTEXT
 *
 * Immutable request context for graph catalog operations with user authentication.
 */

import { User, DatabaseId } from '@/api';

export class CatalogRequest {
  private readonly _databaseName: string;
  private readonly _requestingUsername: string;
  private readonly _usernameOverride: string | undefined;
  private readonly _requesterIsAdmin: boolean;

  private constructor(
    databaseName: string,
    requestingUsername: string,
    usernameOverride: string | undefined,
    requesterIsAdmin: boolean
  ) {
    this._databaseName = databaseName;
    this._requestingUsername = requestingUsername;
    this._usernameOverride = usernameOverride;
    this._requesterIsAdmin = requesterIsAdmin;

    // Security validation: only admin can override username
    if (!requesterIsAdmin && usernameOverride !== undefined) {
      throw new Error('Cannot override the username as a non-admin');
    }
  }

  // Main API methods matching Java exactly

  username(): string {
    return this._usernameOverride ?? this._requestingUsername;
  }

  databaseName(): string {
    return this._databaseName;
  }

  restrictSearchToUsernameCatalog(): boolean {
    // Admin users are allowed to see all graphs when no username override
    if (this._requesterIsAdmin && this._usernameOverride === undefined) {
      return false;
    }
    return true;
  }

  requestingUsername(): string {
    return this._requestingUsername;
  }

  usernameOverride(): string | undefined {
    return this._usernameOverride;
  }

  requesterIsAdmin(): boolean {
    return this._requesterIsAdmin;
  }

  // Static factory methods matching Java API

  static of(user: User, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofWithOverride(user, databaseId, undefined);
  }

  static ofWithOverride(user: User, databaseId: DatabaseId, usernameOverride: string | undefined): CatalogRequest {
    return new CatalogRequest(
      databaseId.databaseName(),
      user.getUsername(),
      usernameOverride,
      user.isAdmin()
    );
  }

  static ofUser(username: string, databaseName: string): CatalogRequest {
    return new CatalogRequest(databaseName, username, undefined, false);
  }

  static ofUserWithDatabase(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofUser(username, databaseId.databaseName());
  }

  static ofAdmin(username: string, usernameOverride: string | undefined, databaseName: string): CatalogRequest {
    return new CatalogRequest(databaseName, username, usernameOverride, true);
  }

  static ofAdminWithDatabase(username: string, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofAdmin(username, undefined, databaseId.databaseName());
  }

  static ofAdminWithOverride(username: string, usernameOverride: string | undefined, databaseId: DatabaseId): CatalogRequest {
    return CatalogRequest.ofAdmin(username, usernameOverride, databaseId.databaseName());
  }
}
