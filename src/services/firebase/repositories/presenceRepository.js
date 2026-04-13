import { collection, onSnapshot } from "firebase/firestore";
import { PRESENCE_COLLECTION } from "../collections";
import { presenceDocRef } from "../pathBuilders";
import { db } from "../../../lib/firebase";

const presenceCollectionRef = () => collection(db, PRESENCE_COLLECTION);

export const subscribeToPresenceRows = ({ onNext, onError } = {}) =>
  onSnapshot(
    presenceCollectionRef(),
    (snapshot) => {
      onNext?.(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })),
      );
    },
    onError,
  );

export const subscribeToPresenceRow = (uid, { onNext, onError } = {}) => {
  if (!uid) {
    onNext?.(null);
    return () => {};
  }

  return onSnapshot(
    presenceDocRef(uid),
    (snapshot) => {
      onNext?.(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    onError,
  );
};
