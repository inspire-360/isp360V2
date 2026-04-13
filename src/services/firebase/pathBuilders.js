import { collection, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  ADMIN_AGGREGATES_COLLECTION,
  ENROLLMENTS_SUBCOLLECTION,
  MATCH_REQUESTS_COLLECTION,
  MISSION_RESPONSES_SUBCOLLECTION,
  MODULE_REPORTS_SUBCOLLECTION,
  PRESENCE_COLLECTION,
  SOS_TICKET_MESSAGES_SUBCOLLECTION,
  SOS_TICKETS_COLLECTION,
  INNOVATIONS_COLLECTION,
  USERS_COLLECTION,
  VIDEO_COMMENTS_SUBCOLLECTION,
  VIDEOS_COLLECTION,
} from "./collections";

export const userDocRef = (uid) => doc(db, USERS_COLLECTION, uid);
export const usersCollectionRef = () => collection(db, USERS_COLLECTION);
export const userEnrollmentsCollectionRef = (uid) =>
  collection(db, USERS_COLLECTION, uid, ENROLLMENTS_SUBCOLLECTION);
export const enrollmentDocRef = (uid, courseId) =>
  doc(db, USERS_COLLECTION, uid, ENROLLMENTS_SUBCOLLECTION, courseId);
export const missionResponsesCollectionRef = (uid, courseId) =>
  collection(
    db,
    USERS_COLLECTION,
    uid,
    ENROLLMENTS_SUBCOLLECTION,
    courseId,
    MISSION_RESPONSES_SUBCOLLECTION,
  );
export const missionResponseDocRef = (uid, courseId, missionId) =>
  doc(
    db,
    USERS_COLLECTION,
    uid,
    ENROLLMENTS_SUBCOLLECTION,
    courseId,
    MISSION_RESPONSES_SUBCOLLECTION,
    missionId,
  );
export const moduleReportsCollectionRef = (uid, courseId) =>
  collection(db, USERS_COLLECTION, uid, ENROLLMENTS_SUBCOLLECTION, courseId, MODULE_REPORTS_SUBCOLLECTION);
export const presenceDocRef = (uid) => doc(db, PRESENCE_COLLECTION, uid);
export const videoDocRef = (videoId) => doc(db, VIDEOS_COLLECTION, videoId);
export const videoCommentsCollectionRef = (videoId) =>
  collection(db, VIDEOS_COLLECTION, videoId, VIDEO_COMMENTS_SUBCOLLECTION);
export const innovationDocRef = (innovationId) => doc(db, INNOVATIONS_COLLECTION, innovationId);
export const supportTicketDocRef = (ticketId) => doc(db, SOS_TICKETS_COLLECTION, ticketId);
export const supportTicketMessagesCollectionRef = (ticketId) =>
  collection(db, SOS_TICKETS_COLLECTION, ticketId, SOS_TICKET_MESSAGES_SUBCOLLECTION);
export const matchRequestDocRef = (requestId) => doc(db, MATCH_REQUESTS_COLLECTION, requestId);
export const adminAggregateDocRef = (docId) => doc(db, ADMIN_AGGREGATES_COLLECTION, docId);
