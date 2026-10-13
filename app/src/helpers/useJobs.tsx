import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyJobs } from "../endpoints/jobs/mine_GET.schema";
import { getJobDetailApi } from "../endpoints/jobs/detail_GET.schema";
import { postCreateJob, InputType as CreateInput } from "../endpoints/jobs/create_POST.schema";
import { postRespondToQuote, InputType as RespondInput } from "../endpoints/jobs/respond_POST.schema";
import { getAdminJobs } from "../endpoints/admin/jobs_GET.schema";
import { getAdminStats } from "../endpoints/admin/stats_GET.schema";
import { postSendQuote, InputType as QuoteInput } from "../endpoints/admin/quote_POST.schema";
import { postUpdateStatus, InputType as StatusInput } from "../endpoints/admin/status_POST.schema";
import { postArtworkUploadUrl } from "../endpoints/artwork/upload-url_POST.schema";
import { postAttachArtwork } from "../endpoints/artwork/attach_POST.schema";
import { postMarkPayment, InputType as PaymentInput } from "../endpoints/admin/payment_POST.schema";
import { postClaimPayment } from "../endpoints/jobs/payment_claim_POST.schema";
import { postArtworkReview, InputType as ReviewInput } from "../endpoints/admin/artwork_review_POST.schema";
import { postConfirmReceived } from "../endpoints/jobs/confirm_received_POST.schema";
import { postFeedback, InputType as FeedbackInput } from "../endpoints/jobs/feedback_POST.schema";
import type { ArtworkReport } from "./artworkReport";

// All React Query hooks for jobs, grouped in one helper object.
export const useJobs = {
  useMine: () => useQuery({ queryKey: ["jobs", "mine"], queryFn: () => getMyJobs(), placeholderData: (p) => p }),
  useDetail: (id: number) =>
    useQuery({ queryKey: ["jobs", "detail", id], queryFn: () => getJobDetailApi({ id }), enabled: Number.isFinite(id) && id > 0 }),
  useAdminJobs: () => useQuery({ queryKey: ["jobs", "admin"], queryFn: () => getAdminJobs(), placeholderData: (p) => p }),
  useAdminStats: () => useQuery({ queryKey: ["jobs", "stats"], queryFn: () => getAdminStats(), placeholderData: (p) => p }),
  useCreate: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: CreateInput) => postCreateJob(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useRespond: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: RespondInput) => postRespondToQuote(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useSendQuote: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: QuoteInput) => postSendQuote(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useUpdateStatus: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: StatusInput) => postUpdateStatus(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useMarkPayment: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: PaymentInput) => postMarkPayment(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useClaimPayment: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number) => postClaimPayment({ id }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useArtworkReview: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: ReviewInput) => postArtworkReview(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useConfirmReceived: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number) => postConfirmReceived({ id }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useFeedback: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: FeedbackInput) => postFeedback(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
  useUploadArtwork: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({
        jobId,
        file,
        checks,
        report,
      }: {
        jobId: number;
        file: File;
        checks: Record<string, boolean>;
        report?: ArtworkReport | null;
      }) => {
        const { presignedUrl, headers, storageKey } = await postArtworkUploadUrl({
          jobId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        const put = await fetch(presignedUrl, { method: "PUT", headers, body: file });
        if (!put.ok) throw new Error("Upload failed. Check your connection and try again.");
        return postAttachArtwork({ jobId, storageKey, fileName: file.name, checks, report: report ?? null });
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
  },
};