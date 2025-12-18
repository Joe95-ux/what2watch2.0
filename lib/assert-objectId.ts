import { ObjectId } from "bson";

export function assertObjectId(id: unknown): string | null {
  return typeof id === "string" && ObjectId.isValid(id) ? id : null;
}
