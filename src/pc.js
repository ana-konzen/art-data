import { getEnvVariable } from "./shared/util.ts";
import { Pinecone } from "npm:@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: getEnvVariable("PC_API_KEY"),
});
const index = pc.index(getEnvVariable("PC_INDEX"));

export async function upsertVector(data, namespace = "") {
  await index.namespace(namespace).upsert([
    {
      id: data.id,
      values: data.embedding,
      metadata: {
        artist: data.artist ?? "",
        title: data.title ?? "",
        date: data.date ?? "",
        image: data.image,
        medium: data.medium ?? "",
        collection: data.collection,
        string: data.string,
        artic_id: data.artic_id,
      },
    },
  ]);
}
