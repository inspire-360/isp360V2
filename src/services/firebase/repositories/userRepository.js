import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { normalizeUserRole } from "../../../utils/userRoles";
import { userDocRef } from "../pathBuilders";
import { timestampNow } from "../timestamps";
import {
  buildAuthFallbackUserProfile,
  buildUserDisplayName,
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

export const adminUpdateUserProfile = async ({
  uid,
  prefix,
  firstName,
  lastName,
  position,
  school,
  role,
  updatedBy,
} = {}) => {
  if (!uid) {
    throw new Error("uid is required to update a user profile.");
  }

  const ref = userDocRef(uid);
  const snapshot = await getDoc(ref);
  const existingProfile = snapshot.exists() ? snapshot.data() : {};
  const normalizedExisting = normalizeUserProfileRecord(existingProfile, {
    id: uid,
  });

  const nextPrefix = String(prefix ?? normalizedExisting.prefix ?? "").trim();
  const nextFirstName = String(firstName ?? normalizedExisting.firstName ?? "").trim();
  const nextLastName = String(lastName ?? normalizedExisting.lastName ?? "").trim();
  const nextPosition = String(position ?? normalizedExisting.position ?? "").trim();
  const nextSchool = String(school ?? normalizedExisting.school ?? "").trim();
  const nextRole = normalizeUserRole(role || normalizedExisting.role || "teacher");
  const nextName = buildUserDisplayName({
    prefix: nextPrefix,
    firstName: nextFirstName,
    lastName: nextLastName,
    fallbackName: normalizedExisting.name,
    email: normalizedExisting.email,
  });

  const payload = {
    prefix: nextPrefix,
    firstName: nextFirstName,
    lastName: nextLastName,
    name: nextName,
    position: nextPosition,
    school: nextSchool,
    role: nextRole,
    updatedAt: timestampNow(),
    updatedBy: String(updatedBy || "").trim() || "admin",
  };

  await setDoc(ref, payload, { merge: true });

  return normalizeUserProfileRecord(
    {
      ...existingProfile,
      ...payload,
    },
    { id: uid },
  );
};
