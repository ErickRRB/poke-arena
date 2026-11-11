CREATE TABLE arena_players (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, deck TEXT NOT NULL, seen INTEGER NOT NULL, joined INTEGER, room_id TEXT);
--> statement-breakpoint
CREATE TABLE arena_queue (id INTEGER PRIMARY KEY, player_id TEXT);
--> statement-breakpoint
INSERT INTO arena_queue (id,player_id) VALUES (1,NULL);
--> statement-breakpoint
CREATE TABLE arena_rooms (id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX arena_rooms_updated ON arena_rooms(updated);
