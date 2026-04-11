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

const resolveDisplayName = ({ currentUser, userProfile, fallbackLabel }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  fallbackLabel;

const buildPreview = (value = "") => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}...`;
};

const patchTicketList = (previousTickets, snapshot) => {
  if (previousTickets.length === 0 || snapshot.docChanges().length === snapshot.docs.length) {
    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .sort(sortSupportTickets);
  }

  const ticketMap = new Map(previousTickets.map((ticket) => [ticket.id, ticket]));

  snapshot.docChanges().forEach((change) => {
    if (change.type === "removed") {
      ticketMap.delete(change.doc.id);
      return;
    }

    ticketMap.set(change.doc.id, {
      id: change.doc.id,
      ...change.doc.data(),
    });
  });

  return Array.from(ticketMap.values()).sort(sortSupportTickets);
};

export function useSupportTickets({ currentUser, userProfile, userRole, isAdminView }) {
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

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
      ? query(ticketsRef, orderBy("createdAt", "desc"))
      : query(
          ticketsRef,
          where("requesterId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
        );

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        startTransition(() => {
          setTickets((previousTickets) => patchTicketList(previousTickets, snapshot));
          setActiveTicketId((previousTicketId) => {
            const nextIds = snapshot.docs.map((item) => item.id);
            if (previousTicketId && nextIds.includes(previousTicketId)) {
              return previousTicketId;
            }

            return nextIds[0] || "";
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

  const createTicket = async ({
    topic,
    mainCategory,
    subCategory,
    urgencyLevel,
    location,
    details,
    contactInfo,
    isConfidential,
  }) => {
    if (!currentUser?.uid) return;

    setCreatingTicket(true);

    try {
      const ticketRef = doc(collection(db, SUPPORT_TICKETS_COLLECTION));
      const messageRef = doc(collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION));
      const requesterDisplayName = isConfidential
        ? "ผู้ส่งแบบไม่ระบุชื่อ"
        : resolveDisplayName({
            currentUser,
            userProfile,
            fallbackLabel: "ครูผู้ส่งคำร้อง",
          });
      const normalizedDetails = String(details || "").trim();
      const batch = writeBatch(db);

      batch.set(ticketRef, {
        requesterId: currentUser.uid,
        requesterDisplayName,
        requesterRole: userRole || "teacher",
        topic: String(topic || "").trim(),
        mainCategory,
        subCategory,
        urgencyLevel,
        location: String(location || "").trim(),
        details: normalizedDetails,
        contactInfo: String(contactInfo || "").trim(),
        isConfidential: Boolean(isConfidential),
        status: "รอดำเนินการ",
        assignedTo: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: buildPreview(normalizedDetails),
        lastMessageAuthorId: currentUser.uid,
        lastMessageAuthorRole: "teacher",
        closedAt: null,
        messageCount: 1,
      });
      batch.set(messageRef, {
        ticketId: ticketRef.id,
        authorId: currentUser.uid,
        authorName: requesterDisplayName,
        authorRole: "teacher",
        body: normalizedDetails,
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
      const messageRef = doc(collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION));
      const authorName = isAdminView
        ? resolveDisplayName({
            currentUser,
            userProfile,
            fallbackLabel: "ผู้ดูแล DU",
          })
        : ticket.requesterDisplayName ||
          resolveDisplayName({
            currentUser,
            userProfile,
            fallbackLabel: "ครูผู้ส่งคำร้อง",
          });
      const normalizedBody = String(body || "").trim();

      const batch = writeBatch(db);
      batch.set(messageRef, {
        ticketId: ticket.id,
        authorId: currentUser.uid,
        authorName,
        authorRole: isAdminView ? "admin" : "teacher",
        body: normalizedBody,
        createdAt: serverTimestamp(),
      });
      batch.set(
        ticketRef,
        {
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessagePreview: buildPreview(normalizedBody),
          lastMessageAuthorId: currentUser.uid,
          lastMessageAuthorRole: isAdminView ? "admin" : "teacher",
          messageCount: increment(1),
        },
        { merge: true },
      );
      await batch.commit();
    } finally {
      setSendingMessage(false);
    }
  };

  const updateTicketAdminMeta = async ({ ticket, nextStatus, assignedTo, note }) => {
    if (!isAdminView || !ticket?.id || !currentUser?.uid) return;

    setUpdatingTicket(true);

    try {
      const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticket.id);
      const messageRef = doc(collection(ticketRef, SUPPORT_TICKET_MESSAGES_SUBCOLLECTION));
      const adminName = resolveDisplayName({
        currentUser,
        userProfile,
        fallbackLabel: "ผู้ดูแล DU",
      });
      const normalizedAssignedTo = String(assignedTo || "").trim();
      const normalizedNote = String(note || "").trim();
      const updateLines = [];

      if (ticket.status !== nextStatus) {
        updateLines.push(`อัปเดตสถานะเป็น ${nextStatus}`);
      }

      if ((ticket.assignedTo || "") !== normalizedAssignedTo) {
        updateLines.push(
          normalizedAssignedTo
            ? `มอบหมายผู้รับผิดชอบเป็น ${normalizedAssignedTo}`
            : "ยกเลิกการระบุผู้รับผิดชอบชั่วคราว",
        );
      }

      if (normalizedNote) {
        updateLines.push(`บันทึกจาก DU: ${normalizedNote}`);
      }

      const messageBody =
        updateLines.length > 0 ? updateLines.join("\n") : "บันทึกการติดตามเคสจากทีม DU";

      const batch = writeBatch(db);
      batch.set(messageRef, {
        ticketId: ticket.id,
        authorId: currentUser.uid,
        authorName: adminName,
        authorRole: "admin",
        body: messageBody,
        createdAt: serverTimestamp(),
      });
      batch.set(
        ticketRef,
        {
          status: nextStatus,
          assignedTo: normalizedAssignedTo,
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessagePreview: buildPreview(messageBody),
          lastMessageAuthorId: currentUser.uid,
          lastMessageAuthorRole: "admin",
          closedAt: nextStatus === "ปิดงาน" ? serverTimestamp() : null,
          messageCount: increment(1),
        },
        { merge: true },
      );
      await batch.commit();
    } finally {
      setUpdatingTicket(false);
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
    updatingTicket,
    createTicket,
    sendMessage,
    updateTicketAdminMeta,
  };
}
