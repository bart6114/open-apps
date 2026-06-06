#!/usr/bin/env node
/**
 * GitHub device flow helper.
 *
 * 1. POST /login/device/code → get user_code + verification_uri + device_code
 * 2. Tell the user to go to the URL and enter the code
 * 3. Poll /login/oauth/access_token until authorization is granted
 * 4. Print the token so the caller can capture it
 *
 * Usage: node scripts/_device-auth.mjs <client_id>
 */

const CLIENT_ID = process.argv[2] || "Iv1.e7b89e013f801f03";
const SCOPE = "public_repo read:user";

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function main() {
  const code = await postJson("https://github.com/login/device/code", {
    client_id: CLIENT_ID,
    scope: SCOPE,
  });

  console.log("===GH_DEVICE_CODE_START===");
  console.log(JSON.stringify(code, null, 2));
  console.log("===GH_DEVICE_CODE_END===");

  const interval = (code.interval || 5) * 1000;
  const expires = Date.now() + (code.expires_in || 600) * 1000;

  process.stdout.write("\n===USER_INSTRUCTIONS_START===\n");
  process.stdout.write(
    `Open: ${code.verification_uri}\n` +
      `Enter code: ${code.user_code}\n` +
      `Waiting up to ${Math.round((code.expires_in || 600) / 60)} minutes for authorization...\n`,
  );
  process.stdout.write("===USER_INSTRUCTIONS_END===\n");

  while (Date.now() < expires) {
    await new Promise((r) => setTimeout(r, interval));
    let tokenRes;
    try {
      tokenRes = await postJson("https://github.com/login/oauth/access_token", {
        client_id: CLIENT_ID,
        device_code: code.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
    } catch (e) {
      process.stderr.write(`poll error: ${e.message}\n`);
      continue;
    }
    if (tokenRes.access_token) {
      console.log("\n===GH_TOKEN_START===");
      console.log(tokenRes.access_token);
      console.log("===GH_TOKEN_END===");
      process.exit(0);
    }
    if (tokenRes.error === "authorization_pending") {
      process.stdout.write(".");
      continue;
    }
    if (tokenRes.error === "slow_down") {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (tokenRes.error === "expired_token") {
      console.error("\nDevice code expired. Re-run this script.");
      process.exit(2);
    }
    if (tokenRes.error === "access_denied") {
      console.error("\nUser denied the authorization request.");
      process.exit(3);
    }
    console.error(`\nUnexpected response: ${JSON.stringify(tokenRes)}`);
    process.exit(4);
  }
  console.error("\nTimed out waiting for authorization.");
  process.exit(5);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
