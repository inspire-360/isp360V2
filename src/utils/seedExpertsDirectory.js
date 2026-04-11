import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
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

    expertChunk.forEach((expert) => {
      const expertRef = doc(db, EXPERTS_COLLECTION, expert.id);
      const existingExpert = existingExpertMap.get(expert.id);

      if (existingExpert) {
        if (!existingExpert.createdAt) {
          throw new Error(
            `ไม่สามารถอัปเดตข้อมูลผู้เชี่ยวชาญ ${expert.displayName} ได้ เพราะเอกสารเดิมไม่มีค่า createdAt`,
          );
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
  }

  return {
    totalCount: experts.length,
    createdCount,
    updatedCount,
    placeholderCategories: seedSummary.placeholderCategories,
  };
}
