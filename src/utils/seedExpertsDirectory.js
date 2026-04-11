import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { buildExpertSeedSummary, buildSeedExpertsFromCatalog } from "../data/expertSeedCatalog";
import { EXPERTS_COLLECTION } from "../data/resourceMatchmaking";
import { db } from "../lib/firebase";

const MAX_BATCH_SIZE = 400;

const chunkItems = (items = [], size = MAX_BATCH_SIZE) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export async function seedExpertsDirectory() {
  const experts = buildSeedExpertsFromCatalog();
  const seedSummary = buildExpertSeedSummary();
  const existingSnapshot = await getDocs(collection(db, EXPERTS_COLLECTION));
  const existingExpertMap = new Map(
    existingSnapshot.docs.map((snapshotItem) => [snapshotItem.id, snapshotItem.data()]),
  );

  let createdCount = 0;
  let updatedCount = 0;

  const expertChunks = chunkItems(experts);

  for (const expertChunk of expertChunks) {
    const batch = writeBatch(db);
    const expertRepairs = [];

    expertChunk.forEach((expert) => {
      const expertRef = doc(db, EXPERTS_COLLECTION, expert.id);
      const existingExpert = existingExpertMap.get(expert.id);

      if (existingExpert) {
        if (!existingExpert.createdAt) {
          expertRepairs.push({ expertRef, expert });
          updatedCount += 1;
          return;
        }

        updatedCount += 1;
        batch.set(expertRef, {
          ...expert,
          createdAt: existingExpert.createdAt,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      createdCount += 1;
      batch.set(expertRef, {
        ...expert,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();

    for (const repairItem of expertRepairs) {
      await deleteDoc(repairItem.expertRef);
      await setDoc(repairItem.expertRef, {
        ...repairItem.expert,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  return {
    totalCount: experts.length,
    createdCount,
    updatedCount,
    placeholderCategories: seedSummary.placeholderCategories,
  };
}
