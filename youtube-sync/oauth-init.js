// oauth-init.js
import dotenv from "dotenv";
import { google } from "googleapis";
import readline from "readline";

dotenv.config();

console.log("CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
console.log("CLIENT SECRET:", process.env.GOOGLE_CLIENT_SECRET);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const scopes = [
  "https://www.googleapis.com/auth/youtube.readonly"
];

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent"
});

console.log("Authorize this app by visiting this URL:\n");
console.log(url + "\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from that page here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\nYour refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\nCopy this into GitHub Secrets as GOOGLE_REFRESH_TOKEN.\n");
  } catch (err) {
    console.error("Error retrieving access token", err);
  }
  rl.close();
});
