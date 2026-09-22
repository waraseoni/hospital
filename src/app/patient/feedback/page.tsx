"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Feedback } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Star, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function PatientFeedbackPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<Feedback[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState<string>("general");
  const [comments, setComments] = useState("");

  const ratings = [
    { v: 1, k: "rating1" }, { v: 2, k: "rating2" }, { v: 3, k: "rating3" },
    { v: 4, k: "rating4" }, { v: 5, k: "rating5" },
  ];
  const categories = ["general", "opd", "ipd", "lab", "pharmacy", "billing", "facility", "staff", "other"];

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (patient) {
        const { data } = await supabase.from("feedback").select("*")
          .eq("patient_id", patient.id).order("created_at", { ascending: false });
        setList((data as Feedback[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { addToast("error", "Please select a rating"); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (!patient) { setSubmitting(false); addToast("error", "Patient record not found"); return; }
    const { error } = await supabase.from("feedback").insert({
      patient_id: patient.id,
      rating,
      category,
      comments: comments.trim() ? comments.trim() : null,
    });
    if (!error) {
      addToast("success", t("feedbackSection.success") || "Thank you!");
      setRating(0);
      setComments("");
      setCategory("general");
      const { data } = await supabase.from("feedback").select("*")
        .eq("patient_id", patient.id).order("created_at", { ascending: false });
      setList((data as Feedback[]) || []);
    } else {
      addToast("error", error.message);
    }
    setSubmitting(false);
  }

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("feedbackSection.title")} subtitle={t("feedbackSection.subtitle")} />

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">{t("feedbackSection.rating")}</p>
          <div className="flex items-center gap-1">
            {ratings.map(({ v }) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                onMouseEnter={() => setHover(v)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
              >
                <Star
                  size={28}
                  className={cn(
                    "transition-colors",
                    (hover || rating) >= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {rating > 0 ? t(`feedbackSection.${ratings[rating - 1].k}` as "feedbackSection.rating1") : ""}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{t("feedbackSection.category")}</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
                )}
              >
                {t(`feedbackSection.${c}` as "feedbackSection.general")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("feedbackSection.comments")}</label>
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            rows={4}
            placeholder={t("feedbackSection.commentsPlaceholder")}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={submitting}>
          <MessageSquare size={15} className="mr-1" />
          {submitting ? t("feedbackSection.submitting") : t("feedbackSection.submit")}
        </Button>
      </form>

      <div className="space-y-2">
        <h2 className="pt-4 text-lg font-semibold">{t("feedbackSection.myFeedback")}</h2>
        {list.length === 0 ? (
          <EmptyState title={t("feedbackSection.noFeedback")} description={t("ui.noData")} />
        ) : (
          list.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} className={i < f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("en-IN")}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">{t(`feedbackSection.${f.category}` as "feedbackSection.general")}</p>
              {f.comments && <p className="mt-2 text-sm">{f.comments}</p>}
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}