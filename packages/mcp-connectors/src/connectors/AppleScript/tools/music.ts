import { z } from "zod";
import { ok, fail, escAS, toASList } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { MUSIC_CONFIG } from "../helpers/constants";

export function registerMusicTools(tool: any) {
  return {
    music_search: tool({
      name: "music_search",
      description:
        "Search the Music library and return tracks (persistentId, name, artist, album, duration). Use this first, then pass a selected persistentId to `music_play`.",
      schema: z.object({
        query: z.string().min(1),
        searchBy: z
          .enum(["any", "name", "artist", "album"]) // 'any' uses Music's built-in search
          .default("any"),
        limit: z.number().int().positive().max(100).default(25),
      }),
      handler: async ({ query, searchBy, limit }: { query: string; searchBy: "any"|"name"|"artist"|"album"; limit: number }) => {
        const asQuery = escAS(query);
        const fieldFilter =
          searchBy === "name"
            ? `ignoring case\nset _matches to every track of library playlist 1 whose name contains "${asQuery}"\nend ignoring`
            : searchBy === "artist"
            ? `ignoring case\nset _matches to every track of library playlist 1 whose artist contains "${asQuery}"\nend ignoring`
            : searchBy === "album"
            ? `ignoring case\nset _matches to every track of library playlist 1 whose album contains "${asQuery}"\nend ignoring`
            : `set _matches to search playlist 1 for "${asQuery}"`;

        const script = `
          tell application "Music"
            try
              ${fieldFilter}
              set _out to ""
              set _count to (count of _matches)
              if _count = 0 then return "__NO_RESULTS__"
              set _max to ${limit}
              if _count < _max then set _max to _count
              repeat with i from 1 to _max
                set _t to item i of _matches
                set _line to (persistent ID of _t) & "||" & (name of _t) & "||" & (artist of _t) & "||" & (album of _t) & "||" & (duration of _t)
                if _out = "" then
                  set _out to _line
                else
                  set _out to _out & "\n" & _line
                end if
              end repeat
              return _out
            on error e
              return "__ERROR__" & e
            end try
          end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          MUSIC_CONFIG.SEARCH_TIMEOUT
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Music search failed",
            { stderr }
          );
        }

        const text = stdout.trim();
        if (text === "__NO_RESULTS__") {
          return ok({ tracks: [], count: 0, query, searchBy, limit });
        }
        if (text.startsWith("__ERROR__")) {
          return fail("Music search failed", { details: text.substring(9) });
        }

        const lines = text.split(/\r?\n/).filter(Boolean);
        const tracks = lines
          .map((line) => {
            const [persistentId, name, artist, album, durationStr] = line.split("||");
            if (!persistentId || !name) return null;
            const duration = Number(durationStr || 0);

            return {
              persistentId,
              name,
              artist: artist || "",
              album: album || "",
              duration,
            };
          })
          .filter((t) => t !== null);

        return ok({ tracks, count: tracks.length, query, searchBy, limit });
      },
    }),

    music_play: tool({
      name: "music_play",
      description:
        "Play a specific track in Music. Prefer passing `persistentId` from `music_search`. As a fallback, you may pass exact `name` with optional `artist`/`album`.",
      schema: z.union([
        z.object({
          persistentId: z.string().min(1),
        }),
        z.object({
          name: z.string().min(1),
          artist: z.string().optional(),
          album: z.string().optional(),
        }),
      ]),
      handler: async (args: any) => {
        let script: string;
        if ("persistentId" in args) {
          const pid = escAS(args.persistentId);
          script = `
            tell application "Music"
              try
                set _matches to every track of library playlist 1 whose persistent ID is "${pid}"
                if (count of _matches) > 0 then
                  set _t to item 1 of _matches
                  play _t
                  return "Playing: " & (name of _t) & " by " & (artist of _t)
                else
                  return "No track found for persistentId: ${pid}"
                end if
              on error e
                return "Music play failed: " & e
              end try
            end tell`;
        } else {
          const name = escAS(args.name);
          const artist = args.artist ? escAS(args.artist) : "";
          const album = args.album ? escAS(args.album) : "";
          const artistClause = args.artist ? ` and artist is "${artist}"` : "";
          const albumClause = args.album ? ` and album is "${album}"` : "";
          script = `
            tell application "Music"
              try
                ignoring case
                  set _matches to every track of library playlist 1 whose name is "${name}"${artistClause}${albumClause}
                end ignoring
                if (count of _matches) > 0 then
                  set _t to item 1 of _matches
                  play _t
                  return "Playing: " & (name of _t) & " by " & (artist of _t)
                else
                  return "No track found with the provided metadata"
                end if
              on error e
                return "Music play failed: " & e
              end try
            end tell`;
        }

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          MUSIC_CONFIG.SEARCH_TIMEOUT
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Music play failed",
            { stderr }
          );
        }
        return ok({ result: stdout });
      },
    }),

    music_create_playlist: tool({
      name: "music_create_playlist",
      description: "Create a new playlist in Music app.",
      schema: z.object({ playlistName: z.string().min(1) }),
      handler: async ({ playlistName }: { playlistName: string }) => {
        const script = `
            tell application "Music"
              make new playlist with properties {name:"${escAS(playlistName)}"}
              return "Created playlist: ${escAS(playlistName)}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 10_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Playlist creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, playlistName });
      },
    }),

    music_add_tracks_to_playlist: tool({
      name: "music_add_tracks_to_playlist",
      description: "Add tracks to an existing playlist by searching for them.",
      schema: z.object({
        playlistName: z.string().min(1),
        trackQueries: z.array(z.string()).min(1),
      }),
      handler: async ({ playlistName, trackQueries }: { playlistName: string; trackQueries: string[] }) => {
        const queries = toASList(trackQueries);
        const script = `
            tell application "Music"
              set _playlist to playlist "${escAS(playlistName)}"
              set _added to 0
              repeat with _query in ${queries}
                try
                  set _results to search playlist 1 for (_query as string)
                  if (count of _results) > 0 then
                    duplicate item 1 of _results to _playlist
                    set _added to _added + 1
                  end if
                end try
              end repeat
              return "Added " & _added & " track(s) to playlist: ${escAS(
                playlistName
              )}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 30_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) ||
              "Add tracks to playlist failed",
            { stderr }
          );
        }
        return ok({
          result: stdout,
          playlistName,
          trackCount: trackQueries.length,
        });
      },
    }),

    music_control_playback: tool({
      name: "music_control_playback",
      description:
        "Control Music app playback (play, pause, next, previous, stop).",
      schema: z.object({
        action: z.enum(["play", "pause", "next", "previous", "stop"]),
      }),
      handler: async ({ action }: { action: "play"|"pause"|"next"|"previous"|"stop" }) => {
        const script = `
            tell application "Music"
              ${action}
              return "Music ${action} command executed"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 5_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || `Music ${action} failed`,
            { stderr }
          );
        }
        return ok({ result: stdout, action });
      },
    }),
  };
}

