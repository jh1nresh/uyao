import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

if (process.stdin.isTTY) {
  console.error("Pipe the password through stdin so it is not saved in shell history.");
  process.exit(1);
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
if (password.length < 12) {
  console.error("Password must contain at least 12 characters.");
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const digest = await promisify(scrypt)(password, salt, 32);
  console.log(`scrypt$${salt.toString("base64url")}$${Buffer.from(digest).toString("base64url")}`);
}
