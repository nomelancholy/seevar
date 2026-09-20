"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { ModerationConfirmDialog } from "@/components/moderation/ModerationConfirmDialog";
import { UserProfileLink } from "@/components/user/UserProfileLink";
import { TextWithEmbedPreview } from "@/components/embed/TextWithEmbedPreview";
import {
  createRefereeReviewReply,
  toggleRefereeReviewLike,
} from "@/lib/actions/referee-reviews";

type Reply = {
  id: string;
  content: string;
  userName: string;
  userHandle: string | null;
};

type Review = {
  id: string;
  likeCount: number;
  likedByMe: boolean;
  replies: Reply[];
};

export function HomeReviewFeedback({
  review,
  currentUserId,
}: {
  review: Review;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(review.likeCount);
  const [likedByMe, setLikedByMe] = useState(review.likedByMe);
  const [replies, setReplies] = useState(review.replies);
  const [likePending, setLikePending] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const replyLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState(false);
  const [moderation, setModeration] = useState<{
    content: string;
    scores: Record<string, number>;
    flagged: boolean;
  } | null>(null);

  useEffect(() => {
    setLikeCount(review.likeCount);
    setLikedByMe(review.likedByMe);
    setReplies(review.replies);
  }, [review.likeCount, review.likedByMe, review.replies]);

  const requireLogin = () => {
    if (currentUserId) return false;
    setLoginHint(true);
    return true;
  };

  const toggleLike = async () => {
    if (requireLogin() || likePending) return;
    setLikePending(true);
    setError(null);
    try {
      const result = await toggleRefereeReviewLike(review.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLikeCount((count) => Math.max(0, count + (result.liked ? 1 : -1)));
      setLikedByMe(result.liked);
      router.refresh();
    } finally {
      setLikePending(false);
    }
  };

  const submitReply = async (content: string, force = false) => {
    if (requireLogin() || replyLock.current) return;
    replyLock.current = true;
    setReplyPending(true);
    setError(null);
    try {
      const result = await createRefereeReviewReply(review.id, content, force);
      if (!result.ok) {
        if ("code" in result && result.code === "MODERATION_WARNING") {
          setModeration({ content, scores: result.scores, flagged: result.flagged });
        } else {
          setError(result.error);
        }
        return;
      }
      setReplies((previous) => [
        ...previous,
        { id: result.replyId, content, userName: "나", userHandle: null },
      ]);
      setReplyText("");
      setReplyOpen(false);
      setModeration(null);
      router.refresh();
    } finally {
      replyLock.current = false;
      setReplyPending(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 text-xs font-mono">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likePending}
          aria-label="평점 코멘트 좋아요"
          aria-pressed={likedByMe}
          className={`inline-flex items-center gap-1 rounded py-1 disabled:opacity-50 ${likedByMe ? "text-blue-400" : "text-zinc-400 hover:text-blue-400"}`}
        >
          <Heart className={`size-3.5 ${likedByMe ? "fill-current" : ""}`} aria-hidden />
          <span>좋아요 {likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!requireLogin()) {
              setReplyOpen((open) => !open);
              setError(null);
            }
          }}
          aria-expanded={replyOpen}
          aria-label="평점 코멘트 답글"
          className="inline-flex items-center gap-1 rounded py-1 text-zinc-400 hover:text-white"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          <span>답글 {replies.length}</span>
        </button>
      </div>
      {loginHint && (
        <p className="mt-1 text-xs text-zinc-400">
          좋아요와 답글은 <Link href="/login" className="text-primary underline">로그인</Link> 후 이용할 수 있습니다.
        </p>
      )}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-zinc-700 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="text-xs text-zinc-300 break-words">
              <UserProfileLink
                handle={reply.userHandle}
                className="mr-2 font-bold text-white hover:underline"
              >
                {reply.userName}
              </UserProfileLink>
              <TextWithEmbedPreview text={reply.content} />
            </div>
          ))}
        </div>
      )}
      {replyOpen && (
        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const content = replyText.trim();
            if (content) void submitReply(content);
          }}
        >
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value.slice(0, 500))}
            maxLength={500}
            rows={2}
            placeholder="답글을 입력해주세요"
            aria-label="평점 코멘트 답글 입력"
            className="w-full resize-none border border-zinc-700 bg-background p-2 text-xs text-white outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={replyPending || !replyText.trim()}
              className="bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {replyPending ? "등록 중..." : "답글 등록"}
            </button>
            <button type="button" onClick={() => setReplyOpen(false)} className="px-2 text-xs text-zinc-400">
              취소
            </button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      <ModerationConfirmDialog
        open={moderation !== null}
        onOpenChange={(open) => { if (!open) setModeration(null); }}
        scores={moderation?.scores ?? {}}
        flagged={moderation?.flagged ?? false}
        onEdit={() => {}}
        onConfirmAnyway={() => { if (moderation) void submitReply(moderation.content, true); }}
        confirmAnywayPending={replyPending}
      />
    </div>
  );
}
