import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { ADMIN_AGGREGATES_COLLECTION } from "../collections";
import {
  buildDefaultAdminAggregateMap,
  mergeAdminAggregateMap,
  normalizeAdminAggregateRecord,
} from "../mappers/adminAggregateMapper";
import { adminAggregateDocRef } from "../pathBuilders";

const adminAggregatesCollectionRef = () => collection(db, ADMIN_AGGREGATES_COLLECTION);

export const subscribeToAdminAggregates = ({ onNext, onError } = {}) =>
  onSnapshot(
    adminAggregatesCollectionRef(),
    (snapshot) => {
      const rows = snapshot.docs.map((item) =>
        normalizeAdminAggregateRecord(item.data(), {
          id: item.id,
        }),
      );

      onNext?.({
        rows,
        byId: mergeAdminAggregateMap(rows),
      });
    },
    onError,
  );

export const subscribeToAdminAggregate = (docId, { onNext, onError } = {}) => {
  if (!docId) {
    onNext?.(buildDefaultAdminAggregateMap()[docId] || null);
    return () => {};
  }

  return onSnapshot(
    adminAggregateDocRef(docId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onNext?.(buildDefaultAdminAggregateMap()[docId] || null);
        return;
      }

      onNext?.(
        normalizeAdminAggregateRecord(snapshot.data(), {
          id: snapshot.id,
        }),
      );
    },
    onError,
  );
};
