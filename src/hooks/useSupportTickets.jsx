import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  SUPPORT_TICKETS_COLLECTION,
  SUPPORT_TICKET_MESSAGES_SUBCOLLECTION,
  sortSupportTickets,
} from "../data/supportTickets";

const buildPreview = (value = "") => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}...`;
};

export function useSupportTickets({ currentUser, userProfile, userRole, isAdminView }) {
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setTickets([]);
      setActiveTicketId("");
      setLoadingTickets(false);
      return undefined;
    }

    setLoadingTickets(true);

    const ticketsRef = collection(db, SUPPORT_TICKETS_COLLECTION);
    const ticketsQuery = isAdminView
      ? ticketsRef
      : query(ticketsRef, where("requesterId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const nextTickets = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort(sortSupportTickets);

        startTransition(() => {
          setTickets(nextTickets);
          setActiveTicketId((previous) => {
            if (previous && nextTickets.some((ticket) => ticket.id === previous)) {
              return previous;
            }

            return nextTickets[0]?.id || "";
          });
          setLoadingTickets(false);
        });
      },
      () => {
        setLoadingTickets(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminView]);

  useEffect(() => {
    if (!activeTicketId) {
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }

    setLoadingMessages(true);

    const messagesQuery = query(
      collection(
        db,
        SUPPORT_TICKETS_COLLECTION,
        activeTicketId,
        SUPPORT_TICKET_MESSAGES_SUBCOLLECTION,
      ),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        startTransition(() => {
          setMessages(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          );
          setLoadingMessages(false);
        });
      },
      () => {
        setLoadingMessages(false);
      },
    );

    return () => unsubscribe();
  }, [activeTicketId]);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) || null,
    [activeTicketId, tickets],
  );

  const createTicket = async ({ subject, category, priority, body }) => {
    if (!currentUser?.uid) return;

    setCreatingTicket(true);

    try {
      const ticketRef = doc(collection(db, SUPPORT_TICKETS_COLLECTION));
      const messageRef = doc(
        collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION),
      );
      const requesterName =
        userProfile?.name ||
        [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "ผู้ใช้งาน";

      const batch = writeBatch(db);
      batch.set(ticketRef, {
        requesterId: currentUser.uid,
        requesterName,
        requesterEmail: currentUser.email || "",
        requesterRole: userRole || "learner",
        subject: subject.trim(),
        category,
        priority,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: buildPreview(body),
        lastMessageAuthorId: currentUser.uid,
        lastMessageAuthorRole: userRole || "learner",
        assignedAdminId: "",
        assignedAdminName: "",
        resolvedAt: null,
        messageCount: 1,
      });
      batch.set(messageRef, {
        ticketId: ticketRef.id,
        authorId: currentUser.uid,
        authorName: requesterName,
        authorRole: userRole || "learner",
        body: body.trim(),
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setActiveTicketId(ticketRef.id);
    } finally {
      setCreatingTicket(false);
    }
  };

  const sendMessage = async ({ ticket, body }) => {
    if (!ticket?.id || !currentUser?.uid) return;

    setSendingMessage(true);

    try {
      const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticket.id);
      const messageRef = doc(
        collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION),
      );
      const authorName =
        userProfile?.name ||
        [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "ผู้ใช้งาน";

      const batch = writeBatch(db);
      batch.set(messageRef, {
        ticketId: ticket.id,
        authorId: currentUser.uid,
        authorName,
        authorRole: isAdminView ? "admin" : userRole || "learner",
        body: body.trim(),
        createdAt: serverTimestamp(),
      });
      batch.set(
        ticketRef,
        {
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessagePreview: buildPreview(body),
          lastMessageAuthorId: currentUser.uid,
          lastMessageAuthorRole: isAdminView ? "admin" : userRole || "learner",
          messageCount: increment(1),
        },
        { merge: true },
      );
      await batch.commit();
    } finally {
      setSendingMessage(false);
    }
  };

  const updateTicketStatus = async ({ ticket, nextStatus }) => {
    if (!isAdminView || !ticket?.id || !currentUser?.uid) return;

    setUpdatingStatus(true);

    try {
      const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticket.id);
      const messageRef = doc(
        collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION),
      );
      const adminName =
        userProfile?.name ||
        [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "ผู้ดูแล DU";

      const statusMessage =
        nextStatus === "pending"
          ? "อัปเดตสถานะเป็น รอดำเนินการ"
          : nextStatus === "investigating"
            ? "อัปเดตสถานะเป็น กำลังตรวจสอบ"
            : "อัปเดตสถานะเป็น แก้ไขแล้ว";

      const batch = writeBatch(db);
      batch.set(
        ticketRef,
        {
          status: nextStatus,
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessagePreview: statusMessage,
          lastMessageAuthorId: currentUser.uid,
          lastMessageAuthorRole: "admin",
          assignedAdminId: currentUser.uid,
          assignedAdminName: adminName,
          resolvedAt: nextStatus === "resolved" ? serverTimestamp() : null,
          messageCount: increment(1),
        },
        { merge: true },
      );
      batch.set(messageRef, {
        ticketId: ticket.id,
        authorId: currentUser.uid,
        authorName: adminName,
        authorRole: "admin",
        body: statusMessage,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } finally {
      setUpdatingStatus(false);
    }
  };

  return {
    tickets,
    activeTicketId,
    setActiveTicketId,
    activeTicket,
    messages,
    loadingTickets,
    loadingMessages,
    creatingTicket,
    sendingMessage,
    updatingStatus,
    createTicket,
    sendMessage,
    updateTicketStatus,
  };
}
