// Links the WhatsApp account that sends sign-in codes. Stop the app first:
// WhatsApp allows one connection per linked device.
//
// Usage: npm run whatsapp:pair -- 263771234567
// Then on that phone: WhatsApp > Linked devices > Link a device >
// Link with phone number instead, and enter the code printed here.
import makeWASocket, { useMultiFileAuthState } from "baileys";

const LOGGED_OUT = 401;
const RESTART_REQUIRED = 515;
const CONNECTION_REPLACED = 440;

const phone = (process.argv[2] ?? "").replace(/^\+/, "");
if (!/^[1-9]\d{7,14}$/.test(phone)) {
  console.error("Usage: npm run whatsapp:pair -- 263771234567");
  console.error("Use the number of the WhatsApp account that will send codes,");
  console.error("with its country code and no plus sign.");
  process.exit(1);
}

const authDirectory = process.env.WHATSAPP_AUTH_DIR || ".data/whatsapp-auth";

// Silent, so nothing from the session ends up in the terminal history.
const logger = {
  level: "silent",
  child: () => logger,
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};

let codeRequested = false;

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
  const socket = makeWASocket({
    auth: state,
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
  });
  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    if (update.qr && !codeRequested) {
      codeRequested = true;
      const code = await socket.requestPairingCode(phone);
      console.log(`\nPairing code: ${code}\n`);
      console.log("On the phone for that number, open WhatsApp > Linked devices");
      console.log("> Link a device > Link with phone number instead, and enter it.");
      console.log("Waiting for you to confirm...\n");
    }

    if (update.connection === "open") {
      console.log(`Linked. Session saved in ${authDirectory}.`);
      console.log("Keep that folder private: it gives access to this WhatsApp account.");
      // Give the final credentials time to reach the disk.
      setTimeout(() => process.exit(0), 2000);
    }

    if (update.connection === "close") {
      const status = update.lastDisconnect?.error?.output?.statusCode;
      if (status === RESTART_REQUIRED) {
        // WhatsApp always asks for this straight after linking.
        await connect();
      } else if (status === LOGGED_OUT) {
        console.error("WhatsApp refused or ended the link.");
        console.error(`Delete ${authDirectory}, then run this again.`);
        process.exit(1);
      } else if (status === CONNECTION_REPLACED) {
        console.error("Another connection took over. Stop the app and run this again.");
        process.exit(1);
      } else {
        console.error(`Connection closed (status ${status ?? "unknown"}). Retrying...`);
        setTimeout(connect, 3000);
      }
    }
  });
}

await connect();
