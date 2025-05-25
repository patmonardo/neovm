import { GraphStoreCatalog } from "./GraphStoreCatalog";
import { StringFormatting } from "@/utils/StringFormatting";

export class GraphNotFoundException extends Error {
  public readonly userCatalogKey: GraphStoreCatalog.UserCatalog.UserCatalogKey;

  constructor(userCatalogKey: GraphStoreCatalog.UserCatalog.UserCatalogKey) {
    super(
      StringFormatting.formatWithLocale(
        "Graph with name `%s` does not exist on database `%s`. It might exist on another database.",
        userCatalogKey.graphName(),
        userCatalogKey.databaseName()
      )
    );
    this.name = "GraphNotFoundException"; // Standard practice for custom errors in JS/TS
    this.userCatalogKey = userCatalogKey;

    // Set the prototype explicitly for ES5 and older environments if needed
    // Object.setPrototypeOf(this, GraphNotFoundException.prototype);
  }

  public graphName(): string {
    return this.userCatalogKey.graphName();
  }

  public databaseName(): string {
    return this.userCatalogKey.databaseName();
  }
}
