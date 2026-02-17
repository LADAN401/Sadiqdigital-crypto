const axios = require("axios");
const { bot } = require("../lib/");

const ALCHEMY_KEY = "IO1rDGgr548lDTF1aDYMQ";
const ETHERSCAN_KEY = "WPX16FXMJMAIVZ62NHX9S38MRBXSDNEG2V";

function riskEngine(liquidity, holders) {
  if (liquidity < 5000 || holders < 100) return "High";
  if (liquidity < 15000 || holders < 300) return "Medium";
  return "Low";
}

bot(
  {
    pattern: "elitescan ?(.*)",
    fromMe: true,
    desc: "Multi-chain Elite Scanner",
    type: "crypto",
  },
  async (message, match) => {
    if (!match) return message.send("Provide contract address.");

    const contract = match.trim();

    try {
      // ================= DEXSCREENER MAIN =================
      const dex = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${contract}`
      );

      if (!dex.data.pairs?.length)
        return message.send("Token not found.");

      const pair = dex.data.pairs[0];

      const chain = pair.chainId;
      const price = pair.priceUsd;
      const liquidity = pair.liquidity.usd;
      const mc = pair.fdv;
      const volume1h = pair.volume.h1;
      const holders = pair.baseToken.holders || "N/A";

      // ================= DEX PAID CHECK =================
      let dexPaid = "🔴 No";
      try {
        const paid = await axios.get(
          `https://api.dexscreener.com/orders/v1/${chain}/${contract}`
        );
        if (paid.data?.length) dexPaid = "🟢 Dex Paid";
      } catch {}

      // ================= BOOST CHECK =================
      let boosts = 0;
      try {
        const boost = await axios.get(
          `https://api.dexscreener.com/token-boosts/top/v1`
        );
        boosts =
          boost.data.find(
            (b) => b.tokenAddress.toLowerCase() === contract.toLowerCase()
          )?.boostCount || 0;
      } catch {}

      // ================= ETHERSCAN HOLDER COUNT =================
      let holderCount = holders;
      try {
        const ethScan = await axios.get(
          `https://api.etherscan.io/api?module=token&action=tokenholdercount&contractaddress=${contract}&apikey=${ETHERSCAN_KEY}`
        );
        holderCount = ethScan.data.result;
      } catch {}

      const risk = riskEngine(liquidity, holderCount);

      const basedLink = `https://t.me/based_eth_bot?start=r_Elite_xyz_b_${contract}`;

      const output = `
🦅 ELITE DEGEN SCAN

Token: ${pair.baseToken.name} (${pair.baseToken.symbol})
Price: $${price}
MC: $${Number(mc).toLocaleString()}
Liquidity: $${Number(liquidity).toLocaleString()}
Holders: ${holderCount}

${dexPaid}
🔥 Boosts: ${boosts}
📈 Volume 1h: ${volume1h}
⚠️ Risk: ${risk}

${contract}${basedLink}
`;

      await message.send(output);
    } catch (e) {
      console.log(e);
      await message.send("Scan failed.");
    }
  }
);
