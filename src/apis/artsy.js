const errorLogs = {};

import { getEnvVariable } from "../shared/util.ts";

async function getArtsyToken() {
  try {
    const response = await fetch("https://api.artsy.net/api/tokens/xapp_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: getEnvVariable("ARTSY_CLIENT_ID"),
        client_secret: getEnvVariable("ARTSY_CLIENT_SECRET"),
      }),
    });
    if (!response.ok) {
      throw new Error(`Error fetching token: ${response.statusText}`);
    }
    const jsonData = await response.json();
    return jsonData.token;
  } catch (error) {
    errorLogs["artsyToken"] = error;
    // console.error("Failed to get Artsy token");
    return null;
  }
}

async function getArtsyID(name) {
  try {
    const artistName = name.replace(/ /g, "+");
    const response = await fetch(`https://api.artsy.net/api/search?q=${artistName}`, {
      headers: {
        "X-Xapp-Token": await getArtsyToken(),
      },
    });
    if (!response.ok) {
      throw new Error(`Error fetching artist ID: ${response.statusText}`);
    }
    const jsonData = await response.json();
    for (const result of jsonData._embedded.results) {
      if (result.type === "artist") {
        const term = "artists/";
        const str = result._links.self.href;
        return str.substring(str.indexOf(term) + term.length);
      }
    }
    return null;
  } catch (error) {
    errorLogs[name] = error;
    // console.error("Failed to get Artsy ID");
    return null;
  }
}

export async function getArtsyGenes(name) {
  if (name === null) {
    return null;
  }
  try {
    const artistID = await getArtsyID(name);
    if (artistID === null) {
      return null;
    }
    const urls = [];
    const genes = [];
    urls.push(`https://api.artsy.net/api/genes?artist_id=${artistID}`);

    for (const url of urls) {
      await new Promise((resolve) => setTimeout(resolve, 250));

      const response = await fetch(url, {
        headers: {
          "X-Xapp-Token": await getArtsyToken(),
        },
      });
      if (!response.ok) {
        throw new Error(`Error fetching genes: ${response.statusText}`);
      }
      const jsonData = await response.json();
      if (jsonData._embedded === undefined) {
        continue;
      }

      if (jsonData._embedded.genes.length > 0) {
        if (jsonData._links.next !== undefined) {
          urls.push(jsonData._links.next.href);
        }
        for (const gene of jsonData._embedded.genes) {
          if (gene.display_name !== null) {
            genes.push(gene.display_name);
          } else {
            genes.push(gene.name);
          }
        }
      }
    }
    if (genes.length === 0) {
      return null;
    }
    return genes;
  } catch (error) {
    errorLogs[name] = error;
    console.error("Failed to get Artsy genes");
    return null;
  }
}

Deno.writeTextFile("data/error-logs-artsy.json", JSON.stringify(errorLogs, null, 2));
