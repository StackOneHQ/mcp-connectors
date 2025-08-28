import { z } from "zod";
import { ok, fail, escAS } from "../helpers/utils";
import { runOsascript, mapOsascriptError } from "../helpers/osascript";
import { MAIL_CONFIG, MESSAGES_CONFIG } from "../helpers/constants";

export function registerCommunicationTools(tool: any) {
  return {
    mail_send: tool({
      name: "mail_send",
      description: "Send an email using the Mail app.",
      schema: z.object({
        to: z.string().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
        cc: z.string().optional(),
        bcc: z.string().optional(),
      }),
      handler: async ({ to, subject, body, cc, bcc }: any) => {
        const script = `
            tell application "Mail"
              set _msg to make new outgoing message with properties {
                subject: "${escAS(subject)}",
                content: "${escAS(body)}"
              }
              tell _msg
                make new to recipient with properties {address: "${escAS(to)}"}
                ${
                  cc
                    ? `make new cc recipient with properties {address: "${escAS(
                        cc
                      )}"}`
                    : ""
                }
                ${
                  bcc
                    ? `make new bcc recipient with properties {address: "${escAS(
                        bcc
                      )}"}`
                    : ""
                }
              end tell
              send _msg
              return "Email sent to: ${escAS(to)}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          MAIL_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Mail send failed",
            { stderr }
          );
        }
        return ok({ result: stdout, to, subject });
      },
    }),

    messages_send: tool({
      name: "messages_send",
      description: "Send a text message to a phone number.",
      schema: z.object({
        phoneNumber: z.string().min(1),
        message: z.string().min(1),
      }),
      handler: async ({ phoneNumber, message }: any) => {
        const script = `
            tell application "Messages"
              set _service to 1st account whose account type = iMessage
              set _buddy to participant "${escAS(phoneNumber)}" of _service
              send "${escAS(message)}" to _buddy
              return "Message sent to: ${escAS(phoneNumber)}"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          MESSAGES_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Message send failed",
            { stderr }
          );
        }
        return ok({ result: stdout, phoneNumber });
      },
    }),

    messages_read: tool({
      name: "messages_read",
      description:
        "Read messages from a phone number (requires Full Disk Access).",
      schema: z.object({
        phoneNumber: z.string().min(1),
        limit: z.number().default(10).optional(),
      }),
      handler: async ({ phoneNumber, limit = 10 }: any) => {
        const script = `
            tell application "Messages"
              try
                set _service to 1st account whose account type = iMessage
                set _buddy to participant "${escAS(phoneNumber)}" of _service
                set _chat to chat with _buddy
                set _messages to messages of _chat
                set _count to count of _messages
                set _limit to ${Math.min(limit, 50)}
                if _count > _limit then
                  set _messages to items ((_count - _limit + 1) through _count) of _messages
                end if
                
                set _result to ""
                repeat with _msg in _messages
                  set _text to text of _msg
                  set _date to date sent of _msg
                  set _result to _result & "[" & _date & "] " & _text & "\\n"
                end repeat
                return _result
              on error e
                return "Messages read failed: " & e & " (Requires Full Disk Access)"
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(
          script,
          MESSAGES_CONFIG.TIMEOUT_MS
        );
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Messages read failed",
            {
              stderr,
              hint: "Grant Full Disk Access in System Settings > Privacy & Security",
            }
          );
        }
        return ok({ result: stdout, phoneNumber, messageCount: limit });
      },
    }),

    contacts_find_number: tool({
      name: "contacts_find_number",
      description: "Find phone numbers for a contact by name.",
      schema: z.object({
        name: z.string().min(1),
      }),
      handler: async ({ name }: { name: string }) => {
        const script = `
            tell application "Contacts"
              try
                set _matches to people whose name contains "${escAS(name)}"
                if (count of _matches) = 0 then
                  return "No contacts found matching: ${escAS(name)}"
                end if
                
                set _result to ""
                repeat with _person in _matches
                  set _personName to name of _person
                  set _phones to phones of _person
                  set _result to _result & "Contact: " & _personName & "\\n"
                  
                  if (count of _phones) = 0 then
                    set _result to _result & "  No phone numbers\\n"
                  else
                    repeat with _phone in _phones
                      set _number to value of _phone
                      set _label to label of _phone
                      set _result to _result & "  " & _label & ": " & _number & "\\n"
                    end repeat
                  end if
                  set _result to _result & "\\n"
                end repeat
                return _result
              on error e
                return "Contact search failed: " & e
              end try
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Contacts search failed",
            { stderr }
          );
        }
        return ok({ result: stdout, query: name });
      },
    }),

    contacts_create_contact: tool({
      name: "contacts_create_contact",
      description: "Create a new contact in Contacts app.",
      schema: z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
      }),
      handler: async ({ firstName, lastName, email, phone, company }: any) => {
        const script = `
            tell application "Contacts"
              set _contact to make new person with properties {first name:"${escAS(
                firstName
              )}"${lastName ? `, last name:"${escAS(lastName)}"` : ""}${
          company ? `, organization:"${escAS(company)}"` : ""
        }}
              ${
                email
                  ? `make new email at end of emails of _contact with properties {label:"work", value:"${escAS(
                      email
                    )}"}`
                  : ""
              }
              ${
                phone
                  ? `make new phone at end of phones of _contact with properties {label:"mobile", value:"${escAS(
                      phone
                    )}"}`
                  : ""
              }
              save
              return "Created contact: ${escAS(firstName)}${
          lastName ? ` ${escAS(lastName)}` : ""
        }"
            end tell`;

        const { stdout, stderr, exitCode } = await runOsascript(script, 15_000);
        if (exitCode !== 0) {
          return fail(
            mapOsascriptError(stderr, exitCode) || "Contact creation failed",
            { stderr }
          );
        }
        return ok({ result: stdout, firstName, lastName });
      },
    }),
  };
}

