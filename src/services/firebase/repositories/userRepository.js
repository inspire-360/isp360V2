import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { userDocRef } from "../pathBuilders";
import {
  buildAuthFallbackUserProfile,
  buildTeacherUserProfileCreateData,
  buildTeacherUserProfileMergeData,
  normalizeUserProfileRecord,
} from "../mappers/userMapper";

export const buildUserProfileFallback = (authUser) => buildAuthFallbackUserProfile(authUser);

export const subscribeToUserProfile = (uid, { authUser = null, onNext, onError } = {}) => {
  if (!uid) return () => {};

  return onSnapshot(
    userDocRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onNext?.(buildAuthFallbackUserProfile(authUser));
        return;
      }

      onNext?.(
        normalizeUserProfileRecord(snapshot.data(), {
          id: snapshot.id,
          authUser,
        }),
      );
    },
    onError,
  );
};

export const getUserProfile = async (uid, { authUser = null } = {}) => {
  if (!uid) return buildAuthFallbackUserProfile(authUser);

  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) {
    return buildAuthFallbackUserProfile(authUser);
  }

  return normalizeUserProfileRecord(snapshot.data(), {
    id: snapshot.id,
    authUser,
  });
};

export const ensureTeacherUserProfile = async ({
  user,
  prefix,
  firstName,
  lastName,
  position,
  school,
  email,
  photoURL,
  lineUserId,
  pdpaAccepted = true,
  role,
  activePath,
  touchLastLogin = true,
} = {}) => {
  if (!user?.uid) {
    throw new Error("User is required to create or sync profile.");
  }

  const ref = userDocRef(user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    const createPayload = buildTeacherUserProfileCreateData({
      user,
      prefix,
      firstName,
      lastName,
      position,
      school,
      email,
      photoURL,
      lineUserId,
      pdpaAccepted,
      role,
      activePath,
    });

    await setDoc(ref, createPayload);

    return normalizeUserProfileRecord(createPayload, {
      id: user.uid,
      authUser: user,
    });
  }

  const existingProfile = snapshot.data();
  const patch = buildTeacherUserProfileMergeData(existingProfile, {
    user,
    prefix,
    firstName,
    lastName,
    position,
    school,
    photoURL,
    lineUserId,
    pdpaAccepted,
    touchLastLogin,
  });

  if (Object.keys(patch).length > 0) {
    await setDoc(ref, patch, { merge: true });
  }

  return normalizeUserProfileRecord(
    {
      ...existingProfile,
      ...patch,
    },
    {
      id: user.uid,
      authUser: user,
    },
  );
};

export const updateTeacherUserProfile = async ({
  user,
  prefix,
  firstName,
  lastName,
  position,
  school,
  photoURL,
} = {}) =>
  ensureTeacherUserProfile({
    user,
    prefix,
    firstName,
    lastName,
    position,
    school,
    photoURL,
    touchLastLogin: false,
  });
