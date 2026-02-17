const axios = require("axios");
const { bot } = require("../lib/");

bot(
 {
   pattern: "scan ?(.*)",
   fromMe: true,
   desc: "Scan crypto token contract",
   type: "crypto",
 },
 async (message, match) => {

   if (!match) {
     return await message.send("❌ Provide contract address\nExample:\n.scan 0x...");
   }

   const contract = match.trim();

   try {

     // Example using DexScreener API (free & powerful)
     const url = `https://api.dexscreener.com/latest/dex/tokens/${contract}`;
     const response = await axios.get(url);

     const data = response.data.pairs[0];

     if (!data) return await message.send("❌ Token not found");

     const name = data.baseToken.name;
     const symbol = data.baseToken.symbol;
     const price = data.priceUsd;
     const mc = data.fdv;
     const liquidity = data.liquidity.usd;
     const volume = data.volume.h24;
     const chain = data.chainId;

     const caption = `
🔵 ${name} ($${symbol})
 ├ ${contract}
 └ #${chain}

📊 Stats
 ├ USD   $${price}
 ├ MC    $${mc}
 ├ Vol   $${volume}
 └ LP    $${liquidity}

🔥 ELITE SCAN by SadiqDigital
`;

     await message.send(caption);

   } catch (err) {
     console.log(err);
     await message.send("❌ Error fetching token data");
   }
 }
);
