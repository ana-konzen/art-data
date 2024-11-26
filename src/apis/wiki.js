const errorLogs = {};

async function getWikiID(name) {
  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${name}&language=en&format=json&origin=*`
    );
    const data = await response.json();
    if (data.search.length === 0) {
      return null;
    }
    return data.search[0].id;
  } catch (error) {
    // console.error("No ID found for entity", name);
    errorLogs[name] = error;
    return null;
  }
}

async function getEntityLabel(entityId) {
  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&format=json&origin=*`
    );
    const data = await response.json();
    return data.entities[entityId].labels.en.value;
  } catch (error) {
    // console.error("No label found for entity", entityId);
    errorLogs[entityId] = error;
    return null;
  }
}

export async function getWikiInfo(name, claimID) {
  try {
    const artistID = await getWikiID(name);
    if (artistID === null) {
      return null;
    }
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${artistID}&format=json&origin=*`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.entities[artistID].claims[claimID] === undefined) {
      return null;
    }
    for (const claim of data.entities[artistID].claims[claimID]) {
      const movementId = claim.mainsnak.datavalue.value.id;
      const label = await getEntityLabel(movementId);
      return label;
    }
  } catch (error) {
    // console.error("Failed to get Wiki info");
    errorLogs[name] = error;
    return null;
  }
}

Deno.writeTextFile("data/error-logs-wiki.json", JSON.stringify(errorLogs, null, 2));
