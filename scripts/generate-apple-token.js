import jwt from "jsonwebtoken";
import fs from "fs";

const privateKey = fs.readFileSync("./config/Apple AuthKey_TAWY9C39QN.p8").toString();

const token = jwt.sign(
  {
    iss: "942957V24Z", // Your Team ID
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 180 // 6 months
  },
  privateKey,
  {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: "TAWY9C39QN" // Your Key ID
    }
  }
);

console.log(token);
