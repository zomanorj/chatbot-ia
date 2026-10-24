import type { components } from "./schema"

type Schemas = components["schemas"]

export type Bot = Schemas["BotRead"]
export type BotCreate = Schemas["BotCreate"]
export type BotUpdate = Schemas["BotUpdate"]
export type Language = Bot["language"]
export type ConversationSummary = Schemas["ConversationSummary"]
export type ConversationDetail = Schemas["ConversationDetail"]
export type StoredMessage = Schemas["MessageRead"]
export type Me = Schemas["MeResponse"]
export type RegisterPayload = Schemas["RegisterRequest"]
