"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Flag,
  Loader2,
  Pencil,
  MessageCircle,
  User,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createRefereeReview,
  toggleRefereeReviewLike,
  reportRefereeReview,
  createRefereeReviewReply,
  toggleRefereeReviewReplyLike,
  reportRefereeReviewReply,
  updateRefereeReviewReply,
  deleteRefereeReviewReply,
} from "@/lib/actions/referee-reviews";
import { REFEREE_REVIEW_COMMENT_MAX_LENGTH } from "@/lib/constants";
import { ModerationConfirmDialog } from "@/components/moderation/ModerationConfirmDialog";
import { UserProfileLink } from "@/components/user/UserProfileLink";

const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const displayUpTo = hoverStar != null ? hoverStar : value;
  return (
    <div
      className="flex justify-start gap-1.5"
      aria-label="별점"
      onMouseLeave={() => setHoverStar(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayUpTo >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverStar(star)}
            className="relative w-6 h-6 shrink-0 p-0 border-0 bg-transparent cursor-pointer"
            style={{ clipPath: STAR_CLIP }}
            aria-label={`${star}점`}
          >
            <span
              className={`absolute inset-0 block transition-colors ${filled ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ clipPath: STAR_CLIP }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

function StarRatingDisplay({
  rating,
  size = "normal",
}: {
  rating: number;
  size?: "normal" | "small";
}) {
  const sizeClass = size === "small" ? "w-3 h-3" : "w-5 h-5";
  return (
    <div
      className="flex justify-start gap-0.5 items-center"
      aria-label={`${rating}점`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const leftVal = i + 0.5;
        const rightVal = i + 1;
        const fill = rating >= rightVal ? 100 : rating >= leftVal ? 50 : 0;
        return (
          <div
            key={i}
            className={`relative shrink-0 ${sizeClass}`}
            style={{ clipPath: STAR_CLIP }}
          >
            <span
              className="absolute inset-0 block bg-muted-foreground/40"
              style={{ clipPath: STAR_CLIP }}
              aria-hidden
            />
            <span className="absolute inset-0 overflow-hidden" aria-hidden>
              <span
                className="absolute left-0 top-0 h-full bg-primary"
                style={{ width: `${fill}%`, clipPath: STAR_CLIP }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  MAIN: "주심",
  ASSISTANT: "부심",
  WAITING: "대기심",
  VAR: "VAR",
};

type RefereeItem = {
  id: string;
  role: string;
  referee: { id: string; name: string; slug: string };
};

/** MAIN/ASSISTANT/WAITING: 1 slot per referee. VAR: 1 slot for all VAR referees. */
type RatingSlot = {
  slotId: string;
  role: string;
  refereeIds: string[];
  label: string;
  names: string;
};

function buildRatingSlots(matchReferees: RefereeItem[]): RatingSlot[] {
  const order: (keyof typeof ROLE_LABEL)[] = [
    "MAIN",
    "ASSISTANT",
    "WAITING",
    "VAR",
  ];
  const byRole = new Map<string, RefereeItem[]>();
  for (const mr of matchReferees) {
    const list = byRole.get(mr.role) ?? [];
    list.push(mr);
    byRole.set(mr.role, list);
  }
  const slots: RatingSlot[] = [];
  for (const role of order) {
    const refs = byRole.get(role) ?? [];
    if (role === "VAR" && refs.length > 0) {
      slots.push({
        slotId: `var-${refs.map((r) => r.referee.id).join("-")}`,
        role: "VAR",
        refereeIds: refs.map((r) => r.referee.id),
        label: ROLE_LABEL.VAR,
        names: refs.map((r) => r.referee.name).join(", "),
      });
    } else {
      for (const mr of refs) {
        slots.push({
          slotId: mr.id,
          role: mr.role,
          refereeIds: [mr.referee.id],
          label: ROLE_LABEL[mr.role] ?? mr.role,
          names: mr.referee.name,
        });
      }
    }
  }
  return slots;
}

function hiddenReviewMessage(): string {
  return "이 글은 커뮤니티 가이드라인 위반 (욕설 및 비하 금지) 으로 숨김 처리된 글입니다.";
}

type ReplyItem = {
  id: string;
  userId: string;
  content: string;
  createdAt: string | Date;
  user: {
    name: string | null;
    image?: string | null;
    handle?: string | null;
    supportingTeam?: { name: string; emblemPath: string | null } | null;
  };
  reactions?: { userId: string }[];
};

type ReviewItem = {
  id: string;
  refereeId: string;
  userId: string;
  rating: number;
  comment: string | null;
  status?: string;
  filterReason?: string | null;
  user: { name: string | null; image: string | null; handle?: string | null };
  fanTeamId: string | null;
  fanTeam: { name: string; emblemPath: string | null } | null;
  reactions?: { userId: string }[];
  replies?: ReplyItem[];
  createdAt: string | Date;
  updatedAt?: string | Date;
};

type Props = {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchReferees: RefereeItem[];
  reviews: ReviewItem[];
  currentUserId: string | null;
  /** URL에서 진입 시 열어둘 심판 슬롯 (referee slug) */
  initialRefereeSlug?: string | null;
  /** 답글 낙관적 업데이트 시 표시할 이름/이미지/팀 */
  currentUserName?: string | null;
  currentUserImage?: string | null;
  currentUserSupportingTeam?: {
    name: string;
    emblemPath: string | null;
  } | null;
};

export function MatchRefereeRatingSection({
  matchId,
  homeTeamId,
  awayTeamId,
  matchReferees,
  reviews: initialReviews,
  currentUserId,
  initialRefereeSlug = null,
  currentUserName = null,
  currentUserImage = null,
  currentUserSupportingTeam = null,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("ABUSE");
  const [reportDescription, setReportDescription] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [replyToReviewId, setReplyToReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  /** 답글 제출 후 서버 새로고침 없이 즉시 표시 (reviewId → 추가된 답글 목록) */
  const [addedReplies, setAddedReplies] = useState<Record<string, ReplyItem[]>>(
    {},
  );
  const replySubmitLockRef = useRef(false);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const [likePendingReplyId, setLikePendingReplyId] = useState<string | null>(
    null,
  );
  const [reportReplyTargetId, setReportReplyTargetId] = useState<string | null>(
    null,
  );
  const [reportReplyReason, setReportReplyReason] = useState("ABUSE");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState("");
  const [replyEditError, setReplyEditError] = useState<string | null>(null);
  const [replyUpdatePending, setReplyUpdatePending] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [deleteReplyModalReplyId, setDeleteReplyModalReplyId] = useState<
    string | null
  >(null);
  const [reportReplyDescription, setReportReplyDescription] = useState("");
  const [reportReplyPending, setReportReplyPending] = useState(false);
  const [reportReplyError, setReportReplyError] = useState<string | null>(null);
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [moderationScores, setModerationScores] = useState<
    Record<string, number>
  >({});
  const [moderationFlagged, setModerationFlagged] = useState(false);
  const [moderationPayload, setModerationPayload] = useState<{
    matchId: string;
    refereeIds: string[];
    role: "MAIN" | "ASSISTANT" | "VAR" | "WAITING";
    rating: number;
    comment: string | null;
  } | null>(null);
  const [moderationForceSubmitPending, setModerationForceSubmitPending] =
    useState(false);
  const [replyModerationModalOpen, setReplyModerationModalOpen] =
    useState(false);
  const [replyModerationScores, setReplyModerationScores] = useState<
    Record<string, number>
  >({});
  const [replyModerationFlagged, setReplyModerationFlagged] = useState(false);
  const [replyModerationPayload, setReplyModerationPayload] = useState<{
    reviewId: string;
    content: string;
  } | null>(null);
  const [
    replyModerationForceSubmitPending,
    setReplyModerationForceSubmitPending,
  ] = useState(false);
  /** 제출 직후 서버 갱신 전에 창에 바로 보이도록 낙관적 추가 리뷰 */
  const [addedReviews, setAddedReviews] = useState<ReviewItem[]>([]);
  const router = useRouter();
  const reviews = useMemo(() => {
    const serverIds = new Set(initialReviews.map((r) => r.id));
    const onlyNew = addedReviews.filter((a) => !serverIds.has(a.id));
    return [...initialReviews, ...onlyNew];
  }, [initialReviews, addedReviews]);

  const ratingSlots = useMemo(
    () => buildRatingSlots(matchReferees),
    [matchReferees],
  );

  const didApplyInitialRef = useRef(false);
  useEffect(() => {
    if (
      didApplyInitialRef.current ||
      !initialRefereeSlug ||
      ratingSlots.length === 0
    )
      return;
    const refereeId = matchReferees.find(
      (mr) => mr.referee.slug === initialRefereeSlug,
    )?.referee.id;
    if (refereeId) {
      const idx = ratingSlots.findIndex((slot) =>
        slot.refereeIds.includes(refereeId),
      );
      if (idx >= 0) {
        setSelectedIdx(idx);
        didApplyInitialRef.current = true;
      }
    }
  }, [initialRefereeSlug, ratingSlots, matchReferees]);

  useEffect(() => {
    const slot = ratingSlots[selectedIdx];
    if (!slot) return;
    const selReviews = initialReviews.filter((r) =>
      slot.refereeIds.includes(r.refereeId),
    );
    const mine = currentUserId
      ? selReviews.find((r) => r.userId === currentUserId)
      : null;
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
    setError(null);
    setIsEditing(false);
  }, [selectedIdx, ratingSlots, initialReviews, currentUserId]);

  const selected = ratingSlots[selectedIdx];
  const selectedReviews = selected
    ? reviews.filter((r) => selected.refereeIds.includes(r.refereeId))
    : [];
  // VAR slot: one user can have two reviews (same content); show one per user for display
  const visibleReviews = (() => {
    const filtered = selectedReviews.filter((r) => r.status !== "HIDDEN");
    if (selected?.refereeIds.length && selected.refereeIds.length > 1) {
      const seen = new Set<string>();
      return filtered.filter((r) => {
        if (seen.has(r.userId)) return false;
        seen.add(r.userId);
        return true;
      });
    }
    return filtered;
  })();
  const myReview = currentUserId
    ? selectedReviews.find((r) => r.userId === currentUserId)
    : null;
  const avgRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length
      : null;
  const count = visibleReviews.length;

  const homeFanReviews = visibleReviews.filter(
    (r) => r.fanTeamId === homeTeamId,
  );
  const awayFanReviews = visibleReviews.filter(
    (r) => r.fanTeamId === awayTeamId,
  );
  const thirdFanReviews = visibleReviews.filter(
    (r) =>
      r.fanTeamId != null &&
      r.fanTeamId !== homeTeamId &&
      r.fanTeamId !== awayTeamId,
  );
  const avgHome =
    homeFanReviews.length > 0
      ? homeFanReviews.reduce((s, r) => s + r.rating, 0) / homeFanReviews.length
      : null;
  const avgAway =
    awayFanReviews.length > 0
      ? awayFanReviews.reduce((s, r) => s + r.rating, 0) / awayFanReviews.length
      : null;
  const avgThird =
    thirdFanReviews.length > 0
      ? thirdFanReviews.reduce((s, r) => s + r.rating, 0) /
        thirdFanReviews.length
      : null;

  const getLikeState = (rev: ReviewItem) => {
    const likes = rev.reactions ?? [];
    const likeCount = likes.length;
    const likedByMe =
      !!currentUserId && likes.some((r) => r.userId === currentUserId);
    return { likeCount, likedByMe };
  };

  const getReplyLikeState = (rp: ReplyItem) => {
    const likes = rp.reactions ?? [];
    const likeCount = likes.length;
    const likedByMe =
      !!currentUserId && likes.some((r) => r.userId === currentUserId);
    return { likeCount, likedByMe };
  };

  /** 쟁점 순간과 동일: 본문에 @ 강조 없이 표시. 위에 @부모 표시 시 본문 선두 @멘션은 제거해 중복 방지 */
  const replyDisplayContent = (content: string, parentDisplayName: string) => {
    const raw = (content ?? "").trimStart();
    if (!raw.startsWith("@")) return content ?? "";
    const firstSpace = raw.indexOf(" ");
    const rest = firstSpace === -1 ? "" : raw.slice(firstSpace).trim();
    return rest || (content ?? "");
  };

  const handleToggleLike = async (reviewId: string) => {
    if (!currentUserId || likePendingId) return;
    setLikePendingId(reviewId);
    const result = await toggleRefereeReviewLike(reviewId);
    setLikePendingId(null);
    if (!result.ok) {
      console.error(result.error);
      return;
    }
    router.refresh();
  };

  const handleToggleReplyLike = async (replyId: string) => {
    if (!currentUserId || likePendingReplyId) return;
    setLikePendingReplyId(replyId);
    const result = await toggleRefereeReviewReplyLike(replyId);
    setLikePendingReplyId(null);
    if (!result.ok) {
      console.error(result.error);
      return;
    }
    router.refresh();
  };

  const openReportForm = (reviewId: string) => {
    setReportTargetId(reviewId);
    setReportReason("ABUSE");
    setReportDescription("");
    setReportError(null);
  };

  const closeReportForm = () => {
    setReportTargetId(null);
    setReportDescription("");
    setReportError(null);
  };

  const openReportReplyForm = (replyId: string) => {
    setReportReplyTargetId(replyId);
    setReportReplyReason("ABUSE");
    setReportReplyDescription("");
    setReportReplyError(null);
  };

  const closeReportReplyForm = () => {
    setReportReplyTargetId(null);
    setReportReplyDescription("");
    setReportReplyError(null);
  };

  const handleSubmitReportReply = async (
    e: React.FormEvent,
    replyId: string,
  ) => {
    e.preventDefault();
    if (!currentUserId) return;
    setReportReplyPending(true);
    setReportReplyError(null);
    const result = await reportRefereeReviewReply(
      replyId,
      reportReplyReason,
      reportReplyDescription.trim() || null,
    );
    setReportReplyPending(false);
    if (result.ok) {
      closeReportReplyForm();
      router.refresh();
    } else {
      setReportReplyError(result.error);
    }
  };

  const openReplyForm = (reviewId: string, mentionName?: string | null) => {
    setReplyToReviewId(reviewId);
    const prefix = mentionName ? `${mentionName} ` : "";
    setReplyText(prefix);
    setReplyError(null);
    // 폼 렌더 후 에디터에 포커스
    setTimeout(() => {
      if (replyFormRef.current) {
        const textarea = replyFormRef.current.querySelector("textarea");
        if (textarea instanceof HTMLTextAreaElement) {
          textarea.focus();
          const len = textarea.value.length;
          textarea.setSelectionRange(len, len);
        }
      }
    }, 0);
  };

  const closeReplyForm = () => {
    setReplyToReviewId(null);
    setReplyText("");
    setReplyError(null);
  };

  const handleSubmitReply = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    if (!currentUserId || replyPending) return;
    if (replySubmitLockRef.current) return;
    const text = replyText.trim();
    if (!text) return;
    replySubmitLockRef.current = true;
    setReplyPending(true);
    setReplyError(null);
    try {
      const result = await createRefereeReviewReply(reviewId, text);
      if (!result.ok) {
        if ("code" in result && result.code === "MODERATION_WARNING") {
          setReplyModerationScores(result.scores);
          setReplyModerationFlagged(result.flagged);
          setReplyModerationPayload({ reviewId, content: text });
          setReplyModerationModalOpen(true);
        } else {
          setReplyError(result.error);
        }
        return;
      }
      setAddedReplies((prev) => ({
        ...prev,
        [reviewId]: [
          ...(prev[reviewId] ?? []),
          {
            id: result.replyId,
            userId: currentUserId,
            content: text,
            createdAt: new Date(),
            user: {
              name: currentUserName ?? "나",
              image: currentUserImage ?? null,
              supportingTeam: currentUserSupportingTeam ?? null,
            },
            reactions: [],
          },
        ],
      }));
      closeReplyForm();
    } finally {
      replySubmitLockRef.current = false;
      setReplyPending(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    if (!currentUserId) return;
    setReportPending(true);
    setReportError(null);
    const result = await reportRefereeReview(
      reviewId,
      reportReason,
      reportDescription.trim() || null,
    );
    setReportPending(false);
    if (result.ok) {
      closeReportForm();
      router.refresh();
    } else {
      setReportError(result.error);
    }
  };

  const handleStartEditReply = (rp: ReplyItem) => {
    setEditingReplyId(rp.id);
    setEditingReplyContent(rp.content);
    setReplyEditError(null);
  };
  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyContent("");
    setReplyEditError(null);
  };
  const handleSaveReplyEdit = async () => {
    if (!editingReplyId || editingReplyContent.trim() === "") return;
    setReplyUpdatePending(true);
    setReplyEditError(null);
    const result = await updateRefereeReviewReply(
      editingReplyId,
      editingReplyContent.trim(),
    );
    setReplyUpdatePending(false);
    if (result.ok) {
      handleCancelEditReply();
      router.refresh();
    } else {
      setReplyEditError(result.error);
    }
  };
  const openDeleteReplyModal = (replyId: string) => {
    setDeleteReplyModalReplyId(replyId);
  };
  const closeDeleteReplyModal = () => {
    if (!deletingReplyId) setDeleteReplyModalReplyId(null);
  };
  const confirmDeleteReply = async () => {
    const replyId = deleteReplyModalReplyId;
    if (!replyId) return;
    setDeletingReplyId(replyId);
    setDeleteReplyModalReplyId(null);
    const result = await deleteRefereeReviewReply(replyId);
    setDeletingReplyId(null);
    if (result.ok) {
      router.refresh();
    } else {
      setReplyEditError(result.error);
    }
  };

  // 베스트(좋아요 5개 이상) 상단 고정: 최대 3개. VAR 슬롯은 visibleReviews(유저당 1건) 기준으로 정렬.
  const orderedSelectedReviews: ReviewItem[] = (() => {
    const withLikes = visibleReviews.map((rev) => ({
      rev,
      likeCount: getLikeState(rev).likeCount,
    }));
    const best = withLikes
      .filter(({ likeCount }) => likeCount >= 5)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 3)
      .map(({ rev }) => rev);
    const bestIds = new Set(best.map((r) => r.id));
    const rest = visibleReviews.filter((r) => !bestIds.has(r.id));
    return [...best, ...rest];
  })();

  const handleSubmit = async () => {
    if (!selected || !currentUserId) return;
    if (rating < 1 || rating > 5) {
      setError("평점을 선택해주세요.");
      return;
    }
    setPending(true);
    setError(null);
    const role = selected.role as "MAIN" | "ASSISTANT" | "VAR" | "WAITING";
    const firstResult = await createRefereeReview(
      matchId,
      selected.refereeIds[0],
      role,
      rating,
      comment || null,
    );
    if (!firstResult.ok) {
      if ("code" in firstResult && firstResult.code === "MODERATION_WARNING") {
        setModerationScores(firstResult.scores);
        setModerationFlagged(firstResult.flagged);
        setModerationPayload({
          matchId,
          refereeIds: selected.refereeIds,
          role,
          rating,
          comment: comment || null,
        });
        setModerationModalOpen(true);
      } else {
        setError(firstResult.error);
      }
      setPending(false);
      return;
    }
    const created: { refereeId: string; reviewId: string }[] = [
      { refereeId: selected.refereeIds[0], reviewId: firstResult.reviewId },
    ];
    for (let i = 1; i < selected.refereeIds.length; i++) {
      const result = await createRefereeReview(
        matchId,
        selected.refereeIds[i],
        role,
        rating,
        comment || null,
      );
      if (!result.ok) {
        setPending(false);
        setError(result.error);
        return;
      }
      created.push({
        refereeId: selected.refereeIds[i],
        reviewId: result.reviewId,
      });
    }
    if (!myReview && currentUserId) {
      const now = new Date();
      const newItems: ReviewItem[] = created.map(({ refereeId, reviewId }) => ({
        id: reviewId,
        refereeId,
        userId: currentUserId,
        rating,
        comment: comment || null,
        status: "VISIBLE",
        user: {
          name: currentUserName ?? null,
          image: currentUserImage ?? null,
        },
        fanTeamId: null,
        fanTeam: currentUserSupportingTeam
          ? {
              name: currentUserSupportingTeam.name,
              emblemPath: currentUserSupportingTeam.emblemPath,
            }
          : null,
        reactions: [],
        replies: [],
        createdAt: now,
        updatedAt: now,
      }));
      setAddedReviews((prev) => [...prev, ...newItems]);
    }
    setPending(false);
    if (!myReview) {
      setRating(0);
      setComment("");
    } else {
      setIsEditing(false);
    }
    router.refresh();
  };

  const handleModerationForceSubmitReview = async () => {
    if (!moderationPayload || !currentUserId) return;
    setModerationForceSubmitPending(true);
    const created: { refereeId: string; reviewId: string }[] = [];
    for (const refereeId of moderationPayload.refereeIds) {
      const result = await createRefereeReview(
        moderationPayload.matchId,
        refereeId,
        moderationPayload.role,
        moderationPayload.rating,
        moderationPayload.comment,
        true,
      );
      if (
        !result.ok &&
        !("code" in result && result.code === "MODERATION_WARNING")
      ) {
        setError(result.error);
        setModerationForceSubmitPending(false);
        return;
      }
      if (result.ok) created.push({ refereeId, reviewId: result.reviewId });
    }
    if (created.length > 0) {
      const now = new Date();
      const newItems: ReviewItem[] = created.map(({ refereeId, reviewId }) => ({
        id: reviewId,
        refereeId,
        userId: currentUserId,
        rating: moderationPayload.rating,
        comment: moderationPayload.comment,
        status: "VISIBLE",
        user: {
          name: currentUserName ?? null,
          image: currentUserImage ?? null,
        },
        fanTeamId: null,
        fanTeam: currentUserSupportingTeam
          ? {
              name: currentUserSupportingTeam.name,
              emblemPath: currentUserSupportingTeam.emblemPath,
            }
          : null,
        reactions: [],
        replies: [],
        createdAt: now,
        updatedAt: now,
      }));
      setAddedReviews((prev) => [...prev, ...newItems]);
    }
    setModerationForceSubmitPending(false);
    setModerationModalOpen(false);
    setModerationPayload(null);
    if (!myReview) {
      setRating(0);
      setComment("");
    } else {
      setIsEditing(false);
    }
    router.refresh();
  };

  const handleReplyModerationForceSubmit = async () => {
    if (!replyModerationPayload) return;
    setReplyModerationForceSubmitPending(true);
    const result = await createRefereeReviewReply(
      replyModerationPayload.reviewId,
      replyModerationPayload.content,
      true,
    );
    setReplyModerationForceSubmitPending(false);
    if (result.ok) {
      setAddedReplies((prev) => ({
        ...prev,
        [replyModerationPayload.reviewId]: [
          ...(prev[replyModerationPayload.reviewId] ?? []),
          {
            id: result.replyId,
            userId: currentUserId!,
            content: replyModerationPayload.content,
            createdAt: new Date(),
            user: {
              name: currentUserName ?? "나",
              image: currentUserImage ?? null,
              supportingTeam: currentUserSupportingTeam ?? null,
            },
            reactions: [],
          },
        ],
      }));
      setReplyModerationModalOpen(false);
      setReplyModerationPayload(null);
      closeReplyForm();
    } else if (!("code" in result && result.code === "MODERATION_WARNING")) {
      setReplyError(result.error);
    }
  };

  if (matchReferees.length === 0) return null;

  return (
    <div className="mb-8 border border-border bg-card/50">
      <div className="border-b border-border px-4 md:px-6 py-3">
        <span className="font-mono text-xs font-black tracking-widest text-primary uppercase">
          심판 평가
        </span>
      </div>
      <div className="p-4 md:p-8">
        {/* Referee selector */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-8">
          {ratingSlots.map((slot, idx) => (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`text-left p-3 border transition-colors ${
                idx === selectedIdx
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card/30 hover:border-muted-foreground/50"
              }`}
            >
              <p className="text-xs md:text-sm font-mono text-muted-foreground uppercase font-bold">
                {slot.label}
              </p>
              <p className="text-base md:text-lg font-bold truncate mt-0.5">
                {slot.names}
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Rate this referee + Community summary */}
            <div className="lg:col-span-1 space-y-6">
              {currentUserId && !myReview && (
                <div className="bg-muted/30 border border-border p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs md:text-sm font-black font-mono text-primary uppercase">
                      이 심판 평가
                    </span>
                    <span className="bg-muted text-primary px-2.5 py-1 text-[10px] md:text-xs font-mono font-bold">
                      미제출
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground uppercase font-mono mb-2">
                        {selected.label}: {selected.names}
                      </p>
                      <StarRatingInput value={rating} onChange={setRating} />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-xs md:text-sm text-muted-foreground uppercase font-mono mb-2">
                        <span>한줄평</span>
                        <span className="tabular-nums normal-case">
                          ({comment.length}/{REFEREE_REVIEW_COMMENT_MAX_LENGTH})
                        </span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) =>
                          setComment(
                            e.target.value.slice(
                              0,
                              REFEREE_REVIEW_COMMENT_MAX_LENGTH,
                            ),
                          )
                        }
                        rows={3}
                        placeholder="한줄평을 입력하세요 (최대 200자)"
                        maxLength={REFEREE_REVIEW_COMMENT_MAX_LENGTH}
                        className="w-full bg-background border border-border p-3 text-[10px] md:text-xs font-mono focus:border-primary outline-none resize-none"
                      />
                    </div>
                    {error && (
                      <p className="text-destructive text-[10px] font-mono">
                        {error}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={pending || rating < 1}
                      className="w-full border border-primary bg-primary text-primary-foreground font-black py-3 text-xs md:text-sm tracking-tighter italic uppercase hover:opacity-90 disabled:opacity-50"
                    >
                      {pending ? "저장 중..." : "평가 제출"}
                    </button>
                  </div>
                </div>
              )}
              {currentUserId && myReview && !isEditing && (
                <div className="bg-muted/30 border border-border p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs md:text-sm font-black font-mono text-blue-500 uppercase">
                      내 평가
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted text-muted-foreground px-2 py-0.5 text-xs font-mono">
                        제출됨
                      </span>
                      {myReview.status !== "HIDDEN" && (
                        <button
                          type="button"
                          onClick={() => {
                            setRating(myReview.rating);
                            setComment(myReview.comment ?? "");
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-1 border border-border hover:border-primary bg-card px-2 py-1 text-[10px] md:text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="size-2.5" aria-hidden />
                          수정
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm md:text-base text-muted-foreground font-mono font-medium">
                      {selected.label}: {selected.names}
                    </p>
                    {myReview.status === "HIDDEN" ? (
                      <p className="text-xs text-muted-foreground not-italic">
                        {hiddenReviewMessage()}
                      </p>
                    ) : (
                      <>
                        <StarRatingDisplay rating={myReview.rating} />
                        {myReview.comment && (
                          <div className="text-sm text-muted-foreground not-italic">
                            <TextWithEmbedPreview text={myReview.comment} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {currentUserId && myReview && isEditing && (
                <div className="bg-muted/30 border border-border p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs md:text-sm font-black font-mono text-primary uppercase">
                      평가 수정
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground uppercase font-mono mb-2">
                        {selected.label}: {selected.names}
                      </p>
                      <StarRatingInput value={rating} onChange={setRating} />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-xs md:text-sm text-muted-foreground uppercase font-mono mb-2">
                        <span>한줄평</span>
                        <span className="tabular-nums normal-case">
                          ({comment.length}/{REFEREE_REVIEW_COMMENT_MAX_LENGTH})
                        </span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) =>
                          setComment(
                            e.target.value.slice(
                              0,
                              REFEREE_REVIEW_COMMENT_MAX_LENGTH,
                            ),
                          )
                        }
                        rows={3}
                        placeholder="한줄평을 입력하세요 (최대 200자)"
                        maxLength={REFEREE_REVIEW_COMMENT_MAX_LENGTH}
                        className="w-full bg-background border border-border p-3 text-[10px] md:text-xs font-mono focus:border-primary outline-none resize-none"
                      />
                    </div>
                    {error && (
                      <p className="text-destructive text-[10px] font-mono">
                        {error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={pending || rating < 1}
                        className="flex-1 border border-primary bg-primary text-primary-foreground font-black py-3 text-[9px] md:text-[10px] tracking-tighter italic uppercase hover:opacity-90 disabled:opacity-50"
                      >
                        {pending ? "저장 중..." : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 border border-border py-3 text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!currentUserId && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  로그인하면 심판 평점을 남길 수 있습니다.
                </p>
              )}

              {/* 팬 요약 */}
              <div className="space-y-4">
                <h4 className="text-xs md:text-sm font-black font-mono text-muted-foreground uppercase tracking-widest">
                  팬 요약
                </h4>
                <div className="flex items-end gap-4 flex-wrap">
                  <span className="text-4xl md:text-5xl font-black italic tracking-tighter">
                    {avgRating != null ? (
                      <>
                        {avgRating.toFixed(1)}
                        {count > 0 && (
                          <span className="ml-2 text-2xl md:text-3xl align-baseline">
                            ({count})
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                  {avgRating != null && (
                    <div className="flex items-center gap-2 mb-1">
                      <StarRatingDisplay rating={avgRating} size="small" />
                    </div>
                  )}
                </div>
                {/* Fan breakdown */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] md:text-xs font-mono text-muted-foreground shrink-0 w-36">
                      홈팀 팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgHome != null ? (avgHome / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgHome != null ? avgHome.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] md:text-xs font-mono text-muted-foreground shrink-0 w-36">
                      원정팀 팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgAway != null ? (avgAway / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgAway != null ? avgAway.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] md:text-xs font-mono text-muted-foreground shrink-0 w-36">
                      제3자 팀팬 평점 종합
                    </span>
                    <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${avgThird != null ? (avgThird / 5) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums w-8 text-right">
                      {avgThird != null ? avgThird.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 실시간 팬 반응 */}
            <div className="lg:col-span-2">
              <h4 className="text-xs md:text-sm font-black font-mono text-muted-foreground uppercase tracking-widest mb-4">
                실시간 팬 반응
              </h4>
              <div className="space-y-0 border border-border bg-black/20 max-h-[400px] overflow-y-auto">
                {orderedSelectedReviews.length === 0 ? (
                  <div className="p-8 text-center font-mono text-sm md:text-base text-muted-foreground">
                    아직 평가가 없습니다.
                  </div>
                ) : (
                  orderedSelectedReviews.map((rev) => {
                    const likeState = getLikeState(rev);
                    const isModerated =
                      rev.status === "HIDDEN" ||
                      rev.status === "PENDING_REAPPROVAL";
                    const isReporting = reportTargetId === rev.id;
                    const serverReplyIds = new Set(
                      (rev.replies ?? []).map((r) => r.id),
                    );
                    const addedRepliesOnly = (
                      addedReplies[rev.id] ?? []
                    ).filter((a) => !serverReplyIds.has(a.id));
                    const mergedRepliesForRev = [
                      ...(rev.replies ?? []),
                      ...addedRepliesOnly,
                    ];
                    return (
                      <div
                        id={`review-${rev.id}`}
                        key={rev.id}
                        className="p-4 md:p-6 border-b border-border last:border-b-0 scroll-mt-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-border bg-card overflow-hidden flex items-center justify-center">
                                {rev.user.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={rev.user.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="size-4 md:size-[18px] text-muted-foreground" />
                                )}
                              </div>
                              {rev.fanTeam?.emblemPath && (
                                <div className="absolute -bottom-1 -right-2 w-5 h-5 bg-white rounded-full border border-zinc-200 flex items-center justify-center p-0.5 shadow z-10 overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={rev.fanTeam.emblemPath}
                                    alt=""
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <UserProfileLink
                                handle={rev.user.handle ?? null}
                                className="text-[10px] md:text-xs font-bold text-white truncate hover:underline hover:text-white"
                              >
                                {rev.user.name ?? "Anonymous"}
                              </UserProfileLink>
                              <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                                {new Date(
                                  rev.updatedAt ?? rev.createdAt,
                                ).toLocaleString("ko-KR")}
                              </span>
                            </div>
                          </div>
                          {rev.status !== "HIDDEN" && (
                            <StarRatingDisplay
                              rating={rev.rating}
                              size="small"
                            />
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0 flex-1">
                            {rev.status === "HIDDEN" ||
                            rev.status === "PENDING_REAPPROVAL" ? (
                              <p className="text-xs md:text-sm text-muted-foreground not-italic">
                                {hiddenReviewMessage()}
                              </p>
                            ) : (
                              rev.comment && (
                                <div className="text-xs md:text-sm text-muted-foreground">
                                  <TextWithEmbedPreview text={rev.comment} />
                                </div>
                              )
                            )}
                          </div>
                          {!isModerated && currentUserId && (
                            <div className="shrink-0 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleLike(rev.id)}
                                disabled={likePendingId === rev.id}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  likeState.likedByMe
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                aria-label="좋아요"
                              >
                                <Heart
                                  className={`size-3.5 ${
                                    likeState.likedByMe ? "fill-current" : ""
                                  }`}
                                />
                                {likeState.likeCount > 0 && (
                                  <span>{likeState.likeCount}</span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openReplyForm(rev.id)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded flex items-center gap-1"
                                aria-label="답글"
                              >
                                <MessageCircle className="size-3.5" />
                                {mergedRepliesForRev.length > 0 && (
                                  <span className="text-[10px] font-mono">
                                    {mergedRepliesForRev.length}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openReportForm(rev.id)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded"
                                aria-label="신고"
                              >
                                <Flag className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {mergedRepliesForRev.length > 0 ? (
                          <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
                            {mergedRepliesForRev.map((rp) => {
                              const replyLikeState = getReplyLikeState(rp);
                              const isReportReplyOpen =
                                reportReplyTargetId === rp.id;
                              const isOwnReply =
                                currentUserId && rp.userId === currentUserId;
                              const isEditingThis = editingReplyId === rp.id;
                              return (
                                <div key={rp.id} className="space-y-1">
                                  <div className="flex items-start gap-4 md:gap-5 text-xs md:text-sm text-muted-foreground">
                                    <div className="relative shrink-0 mt-7">
                                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-border bg-card overflow-hidden flex items-center justify-center">
                                        {rp.user.image ? (
                                          <img
                                            src={rp.user.image}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <User className="size-4 md:size-[18px] text-muted-foreground" />
                                        )}
                                      </div>
                                      {rp.user.supportingTeam?.emblemPath && (
                                        <div className="absolute -bottom-0.5 -right-2 w-4 h-4 bg-white rounded-full border border-zinc-200 flex items-center justify-center p-px shadow z-10 overflow-hidden">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={
                                              rp.user.supportingTeam.emblemPath
                                            }
                                            alt=""
                                            className="w-full h-full object-contain"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                      {isEditingThis ? (
                                        <div className="min-w-0 flex-1 space-y-1">
                                          <textarea
                                            value={editingReplyContent}
                                            onChange={(e) =>
                                              setEditingReplyContent(
                                                e.target.value.slice(0, 500),
                                              )
                                            }
                                            rows={2}
                                            className="w-full bg-background border border-border px-2 py-1 text-xs md:text-sm font-mono rounded focus:border-primary outline-none resize-none"
                                            placeholder="댓글 내용"
                                          />
                                          {replyEditError && (
                                            <p className="text-destructive text-[9px] font-mono">
                                              {replyEditError}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={handleSaveReplyEdit}
                                              disabled={replyUpdatePending}
                                              className="px-2 py-1 bg-primary text-primary-foreground text-[9px] font-mono rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                                            >
                                              {replyUpdatePending && (
                                                <Loader2 className="size-3 animate-spin" />
                                              )}
                                              저장
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleCancelEditReply}
                                              disabled={replyUpdatePending}
                                              className="px-2 py-1 border border-border text-[9px] font-mono rounded hover:bg-muted/50"
                                            >
                                              취소
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-start justify-between gap-2 flex-wrap min-w-0 flex-1">
                                            <div className="min-w-0 flex flex-col gap-0.5">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground">
                                                  @
                                                  {rev.user?.name ??
                                                    "Anonymous"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <UserProfileLink
                                                  handle={
                                                    rp.user.handle ?? null
                                                  }
                                                  className="text-[10px] md:text-xs font-bold text-white hover:underline hover:text-white"
                                                >
                                                  {rp.user.name ?? "Anonymous"}
                                                </UserProfileLink>
                                                <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                                                  {new Date(
                                                    rp.createdAt,
                                                  ).toLocaleString("ko-KR")}
                                                </span>
                                              </div>
                                              <div className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                                <span>
                                                  {replyDisplayContent(
                                                    rp.content,
                                                    rev.user?.name ??
                                                      "Anonymous",
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                            {currentUserId && (
                                              <div className="shrink-0 flex items-center gap-2 mt-2 md:mt-11">
                                                {isOwnReply && (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleStartEditReply(rp)
                                                      }
                                                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                                      aria-label="수정"
                                                    >
                                                      <Pencil className="size-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        openDeleteReplyModal(
                                                          rp.id,
                                                        )
                                                      }
                                                      disabled={
                                                        deletingReplyId ===
                                                        rp.id
                                                      }
                                                      className="p-0.5 text-muted-foreground hover:text-destructive rounded disabled:opacity-50"
                                                      aria-label="삭제"
                                                    >
                                                      {deletingReplyId ===
                                                      rp.id ? (
                                                        <Loader2 className="size-3 animate-spin" />
                                                      ) : (
                                                        <Trash2 className="size-3" />
                                                      )}
                                                    </button>
                                                  </>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleToggleReplyLike(rp.id)
                                                  }
                                                  disabled={
                                                    likePendingReplyId === rp.id
                                                  }
                                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                                    replyLikeState.likedByMe
                                                      ? "text-primary"
                                                      : "text-muted-foreground hover:text-foreground"
                                                  }`}
                                                  aria-label="좋아요"
                                                >
                                                  <Heart
                                                    className={`size-3 ${
                                                      replyLikeState.likedByMe
                                                        ? "fill-current"
                                                        : ""
                                                    }`}
                                                  />
                                                  {replyLikeState.likeCount >
                                                    0 && (
                                                    <span>
                                                      {replyLikeState.likeCount}
                                                    </span>
                                                  )}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    openReplyForm(
                                                      rev.id,
                                                      rp.user.name
                                                        ? `@${rp.user.name}`
                                                        : undefined,
                                                    )
                                                  }
                                                  className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                                  aria-label="답글"
                                                >
                                                  <MessageCircle className="size-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    openReportReplyForm(rp.id)
                                                  }
                                                  className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                                  aria-label="신고"
                                                >
                                                  <Flag className="size-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {isReportReplyOpen && (
                                    <form
                                      onSubmit={(e) =>
                                        handleSubmitReportReply(e, rp.id)
                                      }
                                      className="ml-8 p-2 border border-border bg-black/20 space-y-2 rounded text-[9px]"
                                    >
                                      <p className="font-mono text-muted-foreground">
                                        신고 사유 선택
                                      </p>
                                      <div className="flex flex-wrap gap-2 font-mono">
                                        {[
                                          {
                                            value: "ABUSE",
                                            label: "욕설 및 비하",
                                          },
                                          {
                                            value: "SPAM",
                                            label: "도배 및 광고",
                                          },
                                          {
                                            value: "INAPPROPRIATE",
                                            label: "부적절한 게시물",
                                          },
                                          {
                                            value: "FALSE_INFO",
                                            label: "허위 사실",
                                          },
                                        ].map((opt) => (
                                          <label
                                            key={opt.value}
                                            className="inline-flex items-center gap-1"
                                          >
                                            <input
                                              type="radio"
                                              className="rounded border-border"
                                              name={`reportReplyReason-${rp.id}`}
                                              value={opt.value}
                                              checked={
                                                reportReplyReason === opt.value
                                              }
                                              onChange={(e) =>
                                                setReportReplyReason(
                                                  e.target.value,
                                                )
                                              }
                                            />
                                            {opt.label}
                                          </label>
                                        ))}
                                      </div>
                                      <textarea
                                        value={reportReplyDescription}
                                        onChange={(e) =>
                                          setReportReplyDescription(
                                            e.target.value.slice(0, 500),
                                          )
                                        }
                                        rows={1}
                                        className="w-full bg-background border border-border px-2 py-1 font-mono rounded focus:border-primary outline-none resize-none"
                                        placeholder="상세 설명 (선택)"
                                      />
                                      {reportReplyError && (
                                        <p className="text-destructive font-mono">
                                          {reportReplyError}
                                        </p>
                                      )}
                                      <div className="flex gap-2">
                                        <button
                                          type="submit"
                                          disabled={reportReplyPending}
                                          className="px-2 py-1 bg-primary text-primary-foreground font-mono rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                                        >
                                          {reportReplyPending && (
                                            <Loader2 className="size-2.5 animate-spin" />
                                          )}
                                          {reportReplyPending
                                            ? "처리 중..."
                                            : "신고하기"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={closeReportReplyForm}
                                          className="px-2 py-1 border border-border font-mono rounded hover:bg-muted/50"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </form>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                        {replyToReviewId === rev.id && currentUserId && (
                          <form
                            ref={replyFormRef}
                            onSubmit={(e) => handleSubmitReply(e, rev.id)}
                            className="mt-3 p-3 border border-border bg-black/20 space-y-2 rounded"
                          >
                            <textarea
                              value={replyText}
                              onChange={(e) =>
                                setReplyText(e.target.value.slice(0, 500))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  replyFormRef.current?.requestSubmit();
                                }
                              }}
                              rows={2}
                              className="w-full bg-background border border-border px-2 py-1.5 text-[10px] font-mono rounded focus:border-primary outline-none resize-none"
                              placeholder="답글 입력... (Enter 전송, Shift+Enter 줄바꿈)"
                            />
                            {replyError && (
                              <p className="text-destructive text-[10px] font-mono">
                                {replyError}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={replyPending || !replyText.trim()}
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {replyPending && (
                                  <Loader2 className="size-3 animate-spin" />
                                )}
                                {replyPending ? "전송 중..." : "답글"}
                              </button>
                              <button
                                type="button"
                                onClick={closeReplyForm}
                                className="px-3 py-1.5 border border-border text-[10px] font-mono rounded hover:bg-muted/50"
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        )}
                        {isReporting && (
                          <form
                            onSubmit={(e) => handleSubmitReport(e, rev.id)}
                            className="mt-3 p-3 border border-border bg-black/20 space-y-2 rounded"
                          >
                            <p className="font-mono text-[9px] text-muted-foreground">
                              신고 사유 선택
                            </p>
                            <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                              {[
                                { value: "ABUSE", label: "욕설 및 비하" },
                                { value: "SPAM", label: "도배 및 광고" },
                                {
                                  value: "INAPPROPRIATE",
                                  label: "부적절한 게시물 (정치·혐오 등)",
                                },
                                {
                                  value: "FALSE_INFO",
                                  label: "허위 사실 유포",
                                },
                              ].map((opt) => (
                                <label
                                  key={opt.value}
                                  className="inline-flex items-center gap-1"
                                >
                                  <input
                                    type="radio"
                                    className="rounded border-border"
                                    name={`reportReason-review-${rev.id}`}
                                    value={opt.value}
                                    checked={reportReason === opt.value}
                                    onChange={(e) =>
                                      setReportReason(e.target.value)
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                            <div>
                              <label className="block font-mono text-[9px] text-muted-foreground mb-1">
                                상세 설명 (선택)
                              </label>
                              <textarea
                                value={reportDescription}
                                onChange={(e) =>
                                  setReportDescription(
                                    e.target.value.slice(0, 500),
                                  )
                                }
                                rows={2}
                                className="w-full bg-background border border-border px-2 py-1.5 text-[10px] font-mono rounded focus:border-primary outline-none resize-none"
                                placeholder="추가로 전달할 내용이 있으면 입력해 주세요."
                              />
                            </div>
                            {reportError && (
                              <p className="text-destructive text-[10px] font-mono">
                                {reportError}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={reportPending}
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {reportPending && (
                                  <Loader2 className="size-3 animate-spin" />
                                )}
                                {reportPending ? "처리 중..." : "신고하기"}
                              </button>
                              <button
                                type="button"
                                onClick={closeReportForm}
                                className="px-3 py-1.5 border border-border text-[10px] font-mono rounded hover:bg-muted/50"
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ModerationConfirmDialog
        open={moderationModalOpen}
        onOpenChange={setModerationModalOpen}
        scores={moderationScores}
        flagged={moderationFlagged}
        onEdit={() => {}}
        onConfirmAnyway={handleModerationForceSubmitReview}
        confirmAnywayPending={moderationForceSubmitPending}
      />
      <ModerationConfirmDialog
        open={replyModerationModalOpen}
        onOpenChange={setReplyModerationModalOpen}
        scores={replyModerationScores}
        flagged={replyModerationFlagged}
        onEdit={() => {}}
        onConfirmAnyway={handleReplyModerationForceSubmit}
        confirmAnywayPending={replyModerationForceSubmitPending}
      />

      {/* 댓글 삭제 확인 모달 */}
      <Dialog
        open={deleteReplyModalReplyId !== null}
        onOpenChange={(open) => !open && closeDeleteReplyModal()}
      >
        <DialogContent className="max-w-[320px] rounded-lg border-primary/50 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.2),4px_4px_0_hsl(var(--primary)/0.15)]">
          <DialogHeader className="flex flex-col items-center text-center sm:text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden />
            </div>
            <DialogTitle className="text-base font-black font-mono uppercase tracking-wider not-italic text-foreground">
              댓글 삭제
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs font-mono text-muted-foreground">
              이 댓글을 삭제할까요?
              <br />
              <span className="text-destructive/90">
                삭제된 댓글은 복구할 수 없습니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row justify-center gap-2 sm:justify-center">
            <button
              type="button"
              onClick={closeDeleteReplyModal}
              disabled={!!deletingReplyId}
              className="rounded-md border border-border bg-muted/50 px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmDeleteReply}
              disabled={!!deletingReplyId}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive bg-destructive px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deletingReplyId ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" aria-hidden />
                  삭제
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
