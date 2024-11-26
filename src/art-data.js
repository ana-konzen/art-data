import { getArtsyGenes } from "./apis/artsy.js";
import { getArticPath } from "./apis/artic.js";
import { getWikiInfo } from "./apis/wiki.js";
import { tty } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/tty.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.4/ansi/colors.ts";

const myTty = tty({
  writer: Deno.stdout,
  reader: Deno.stdin,
});

const claimDict = {
  movement: "P135",
  style: "P149",
  depicts: "P180",
  genre: "P136",
};

let counter = 0;

const artData = await Deno.readTextFile("data/art-data.json").then((data) => JSON.parse(data));
const newArtData = [];

export async function getArtData(maxArtworks = 80) {
  const path = getArticPath();
  for await (const dirEntry of Deno.readDir(path)) {
    const artObj = await Deno.readTextFile(`${path}/${dirEntry.name}`).then((data) => JSON.parse(data));
    //check if id is in artData
    if (artData.find((art) => art.artic_id === artObj.id)) {
      continue;
    }
    if (artObj.image_id === null) {
      continue;
    }
    if (
      artObj.artwork_type_title !== "Painting" &&
      artObj.artwork_type_title !== "Drawing" &&
      artObj.artwork_type_title !== "Print" &&
      artObj.artwork_type_title !== "Photograph"
    ) {
      continue;
    }
    if (
      (artObj.artist_title === null ||
        artObj.artist_title.toLowerCase() === "unknown" ||
        artObj.artist_title.toLowerCase() === "artist unknown" ||
        artObj.artist_title.toLowerCase() === "unknown artist" ||
        artObj.artist_title.toLowerCase() === "unknown maker" ||
        artObj.artist_title.toLowerCase() === "maker unknown") &&
      (artObj.title === null || artObj.title.toLowerCase() === "untitled")
    ) {
      continue;
    }
    counter++;
    console.log(`Loading ${counter} of ${maxArtworks}`);
    myTty.eraseLine.cursorUp(1);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const artistName = artData.find((artist) => artist.artist === artObj.artist_title)?.artist;

    const genes = artistName ? artistName.artist_genes : await getArtsyGenes(artObj.artist_title);
    const movement = artObj.artist_title
      ? (await getWikiInfo(`${artObj.artist_title} ${artObj.title}`, claimDict.movement)) ??
        (await getWikiInfo(artObj.artist_title, claimDict.movement)) ??
        null
      : null;

    const style = artObj.artist_title
      ? (await getWikiInfo(`${artObj.artist_title} ${artObj.title}`, claimDict.style)) ??
        (await getWikiInfo(artObj.artist_title, claimDict.style)) ??
        null
      : null;

    const genre = artObj.artist_title
      ? (await getWikiInfo(`${artObj.artist_title} ${artObj.title}`, claimDict.genre)) ??
        (await getWikiInfo(artObj.artist_title, claimDict.genre)) ??
        null
      : null;
    const depicts = artObj.artist_title
      ? (await getWikiInfo(`${artObj.artist_title} ${artObj.title}`, claimDict.depicts)) ?? null
      : null;

    const dataObj = {
      id: `art${artObj.id}`,
      artic_id: artObj.id,
      artist: artObj.artist_title ?? null,
      title: artObj.title ?? null,
      image: artObj.image_id,
      // materials: artObj.material_titles?.join(", ") ?? null,
      subjects: artObj.subject_titles?.join(", ") ?? null,
      classifications: artObj.classification_titles?.join(", ") ?? null,
      terms: artObj.term_titles?.join(", "),
      medium: artObj.medium_display ?? null,
      date: artObj.date_display ?? null,
      colorfulness: artObj.colorfulness ?? null,
      artist_genes: genes?.join(", ") ?? null,
      movement: movement ?? null,
      style: style ?? null,
      genre: genre ?? null,
      depicts: depicts ?? null,
      collection: "Art Institute of Chicago",
    };
    newArtData.push(dataObj);
    artData.push(dataObj);
    if (counter >= maxArtworks) {
      myTty.cursorDown(1);
      console.log(colors.green("Art data loaded"));
      break;
    }
  }
  Deno.writeTextFile("data/art-data.json", JSON.stringify(artData, null, 2));
  return newArtData;
}
