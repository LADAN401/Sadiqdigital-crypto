const axios = require("axios");
const moment = require("moment");
const { bot } = require("../lib/");

// ================= HELPER FUNCTIONS =================

function formatNumber(num) {
  if (!num) return "0";
  return parseFloat(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPrice(num) {
  if (!num) return "0";
  return parseFloat(num).toFixed(8);
}

function timeAgo(timestamp) {
  return moment(timestamp).fromNow();
}

// ================= ELITE SCAN =================

bot(
  {
    pattern: "elitescan ?(.*)",
    fromMe: true,
    desc: "Elite crypto contract scanner",
    type: "crypto",
  },
  async (message, match) => {
    try {
      if (!match)
        return await message.send(
          "❌ Provide contract address\nExample:\n.elitescan 0x..."
        );

      const contract = match.trim();

      // ================= DEXSCREENER DATA =================
      const dexURL = `https://api.dexscreener.com/latest/dex/tokens/${contract}`;
      const dexResponse = await axios.get(dexURL);

      if (!dexResponse.data.pairs || dexResponse.data.pairs.length === 0)
        return await message.send("❌ Token not found on DexScreener.");

      const pair = dexResponse.data.pairs[0];

      const name = pair.baseToken.name;
      const symbol = pair.baseToken.symbol;
      const chain = pair.chainId;
      const price = formatPrice(pair.priceUsd);
      const fdv = formatNumber(pair.fdv);
      const liquidity = formatNumber(pair.liquidity.usd);
      const volume = formatNumber(pair.volume.h24);
      const priceChange1h = pair.priceChange.h1 || 0;
      const priceChange24h = pair.priceChange.h24 || 0;
      const buys = pair.txns.h1.buys;
      const sells = pair.txns.h1.sells;
      const pairAge = timeAgo(pair.pairCreatedAt);

      // ================= HONEYPOT CHECK =================
      let honeypotStatus = "Unknown";
      try {
        const honeypot = await axios.get(
          `https://api.honeypot.is/v2/IsHoneypot?address=${contract}&chain=${chain}`
        );
        honeypotStatus = honeypot.data.honeypotResult.isHoneypot
          ? "🔴 Honeypot"
          : "🟢 Safe";
      } catch (e) {
        honeypotStatus = "Unavailable";
      }

      // ================= GOPLUS SECURITY =================
      let securityFlags = [];
      try {
        const goPlus = await axios.get(
          `https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${contract}`
        );

        const sec = goPlus.data.result[contract];

        if (sec.is_blacklisted === "1") securityFlags.push("Blacklisted");
        if (sec.is_mintable === "1") securityFlags.push("Mintable");
        if (sec.owner_change_balance === "1")
          securityFlags.push("Owner Can Change Balance");
        if (sec.is_proxy === "1") securityFlags.push("Proxy Contract");

        if (securityFlags.length === 0) securityFlags.push("No Major Risks");
      } catch (e) {
        securityFlags.push("Security Unavailable");
      }

      // ================= SOCIAL LINKS =================
      let socials = "";
      if (pair.info) {
        if (pair.info.websites)
          socials += pair.info.websites.map((w) => `🌐 ${w.url}\n`).join("");
        if (pair.info.socials)
          socials += pair.info.socials.map((s) => `🔗 ${s.url}\n`).join("");
      }

      // ================= OUTPUT FORMAT =================

      const output = `
🔵 ${name} ($${symbol})
 ├ ${contract}
 └ #${chain} | ⏳ ${pairAge}

📊 Stats
 ├ USD   $${price}
 ├ MC    $${fdv}
 ├ Vol   $${volume}
 ├ LP    $${liquidity}
 ├ 1H    ${priceChange1h}% | 🟢${buys} 🔴${sells}
 └ 24H   ${priceChange24h}%

🔒 Security
 ├ Honeypot: ${honeypotStatus}
 └ ${securityFlags.join(" | ")}

${socials ? "🌍 Socials:\n" + socials : ""}

🔥 ELITE DEGEN SCAN
`;

      await message.send(output);
    } catch (error) {
      console.log(error);
      await message.send("❌ Elite Scan failed.");
    }
  }
);
