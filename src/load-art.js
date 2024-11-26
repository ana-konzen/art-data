import { getArtData } from "./art-data.js";
import OpenAI from "https://deno.land/x/openai@v4.68.2/mod.ts";
import { upsertVector } from "./pc.js";
import { getEnvVariable } from "./shared/util.ts";
import { tty } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/tty.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

const myTty = tty({
  writer: Deno.stdout,
  reader: Deno.stdin,
});

const maxArtworks = 500;
let counter = 0;

const batchedArt = await batchEmbedArtworks(maxArtworks);
for (const art of batchedArt) {
  console.log(`Loading ${counter} of ${batchedArt.length} to Pinecone`);
  myTty.eraseLine.cursorUp(1);

  await upsertVector(art, "paintings_artic");
  counter++;
}
myTty.cursorDown(1);
console.log(colors.green("Vectors upserted to pinecone"));

async function batchEmbedArtworks(maxArtworks) {
  const artData = await getArtData(maxArtworks);
  // const artData = await Deno.readTextFile("data/art-data.json").then((data) => JSON.parse(data));

  const openai = new OpenAI(getEnvVariable("OPENAI_API_KEY"));
  for (let i = 0; i < artData.length; i += 10) {
    const artString = artData.slice(i, i + 10).map((art) => {
      const parts = [];
      if (art.artist) parts.push(`*Artist*: ${art.artist}`);
      if (art.title) parts.push(`*Title*: ${art.title}`);
      if (art.date) parts.push(`*Date*: ${art.date}`);
      if (art.subjects) parts.push(`*Subjects*: ${art.subjects}`);
      if (art.classifications) parts.push(`*Classifications*: ${art.classifications}`);
      if (art.terms) parts.push(`*Terms*: ${art.terms}`);
      if (art.medium) parts.push(`*Medium*: ${art.medium}`);
      if (art.artist_genes) parts.push(`*Artist Genes*: ${art.artist_genes}`);
      if (art.movement) parts.push(`*Movement*: ${art.movement}`);
      if (art.style) parts.push(`*Style*: ${art.style}`);
      if (art.genre) parts.push(`*Genre*: ${art.genre}`);
      if (art.depicts) parts.push(`*Depicts*: ${art.depicts}`);
      return parts.join("; ");
    });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: artString,
    });
    response.data.forEach((embedding, index) => {
      artData[i + index].string = artString[index];
      artData[i + index].embedding = embedding.embedding;
    });
    console.log(`Processed batch ${i / 10 + 1}`);
    myTty.eraseLine.cursorUp(1);
  }
  myTty.cursorDown(1);
  console.log(colors.green("All embeddings processed"));
  return artData;
}
