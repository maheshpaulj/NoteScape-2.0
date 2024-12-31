import { User } from "./types";

declare global {
    interface CustomJwtSessionClaims extends User {}
}