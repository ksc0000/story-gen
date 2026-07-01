"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { GraduationCap, Loader2, Plus, Trash2, UserRound, Wand2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { useTemplates } from "@/lib/hooks/use-templates";
import { bulkGenerateClassBooksCallable } from "@/lib/functions";
import type { OrgClass, OrgStudent } from "@/lib/types";

function getTemplateBaseId(t: { id: string; variantOf?: string }) {
  return t.variantOf ?? t.id.replace(/-\d+p$/, "");
}

function ClassRosterContent() {
  const params = useSearchParams();
  const orgId = params.get("orgId") ?? "";
  const classId = params.get("classId") ?? "";
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const isOrgAdmin = profile?.orgRole === "org_admin";

  const [cls, setCls] = useState<OrgClass | null>(null);
  const [students, setStudents] = useState<OrgStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!orgId || !classId) return;
    let unsubCls = () => {};
    let unsubStudents = () => {};
    (async () => {
      await user?.getIdToken(true); // rules は custom claim を参照するため更新
      unsubCls = onSnapshot(doc(db, "organizations", orgId, "classes", classId), (snap) => {
        setCls(snap.exists() ? ({ id: snap.id, ...snap.data() } as OrgClass) : null);
      });
      unsubStudents = onSnapshot(
        query(
          collection(db, "organizations", orgId, "classes", classId, "students"),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OrgStudent));
          setLoading(false);
        }
      );
    })();
    return () => {
      unsubCls();
      unsubStudents();
    };
  }, [orgId, classId, user]);

  const addStudent = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      const ageNum = age.trim() ? Number(age) : null;
      await addDoc(collection(db, "organizations", orgId, "classes", classId, "students"), {
        name: trimmed,
        age: Number.isFinite(ageNum) ? ageNum : null,
        createdBy: user?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "organizations", orgId, "classes", classId), {
        studentCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      setName("");
      setAge("");
    } finally {
      setAdding(false);
    }
  };

  const removeStudent = async (studentId?: string) => {
    if (!studentId) return;
    if (!window.confirm("この園児を名簿から削除しますか？")) return;
    await deleteDoc(doc(db, "organizations", orgId, "classes", classId, "students", studentId));
    await updateDoc(doc(db, "organizations", orgId, "classes", classId), {
      studentCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  };

  if (!orgId || !classId) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-8 text-center text-violet-500">
        クラスが指定されていません。
        <div className="mt-4">
          <BackButton />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-6">
      <BackButton className="mb-3" />
      <div className="mb-6 flex items-center gap-2">
        <GraduationCap className="size-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-purple-900">{cls?.name ?? "クラス"}</h1>
        <span className="ml-auto text-sm text-violet-400">{students.length}人</span>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-violet-500">お名前</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="やまだ はなこ"
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStudent();
                }}
              />
            </div>
            <div className="w-20">
              <label className="text-xs font-medium text-violet-500">年齢</label>
              <Input
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="4"
                inputMode="numeric"
                maxLength={2}
              />
            </div>
            <Button onClick={addStudent} disabled={!name.trim() || adding}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {students.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-violet-50 text-violet-400">
                <UserRound className="size-4" />
              </span>
              <span className="text-sm font-medium text-purple-900">{s.name}</span>
              {s.age != null ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-purple-700">
                  {s.age}歳
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeStudent(s.id)}
              className="text-violet-300 transition hover:text-red-500"
              aria-label="削除"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!loading && students.length === 0 ? (
          <p className="py-8 text-center text-sm text-violet-400">
            まだ園児が登録されていません。上のフォームから追加できます。
          </p>
        ) : null}
      </div>

      {isOrgAdmin && students.length > 0 ? (
        <div className="mt-6">
          <BulkGenerateSection orgId={orgId} classId={classId} studentCount={students.length} />
        </div>
      ) : null}
    </PageTransition>
  );
}

function BulkGenerateSection({
  orgId,
  classId,
  studentCount,
}: {
  orgId: string;
  classId: string;
  studentCount: number;
}) {
  const { templates } = useTemplates();
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 固定テンプレートのみ。行事系（思い出・季節）に絞り、ベースIDで重複排除。
  const options = (() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const t of templates) {
      if ((t.creationMode ?? "guided_ai") !== "fixed_template") continue;
      const cat = t.categoryGroupId ?? "";
      if (cat !== "memories" && cat !== "seasonal-events") continue;
      const base = getTemplateBaseId(t);
      if (seen.has(base)) continue;
      seen.add(base);
      list.push({ id: t.id, name: t.name });
    }
    return list;
  })();

  const handleGenerate = async () => {
    if (!templateId || busy) return;
    if (!window.confirm(`このクラスの${studentCount}人分の絵本を一括生成します。よろしいですか？`)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await bulkGenerateClassBooksCallable({
        orgId,
        classId,
        templateId,
        message: message.trim() || undefined,
      });
      setResult(
        `${r.created}冊の生成を開始しました。作成した絵本は「絵本一覧」に順次表示されます（今月あと${r.remainingThisMonth}冊）。`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "一括生成に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="size-4 text-purple-500" /> クラス全員の絵本を作る
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-violet-500">
          行事テンプレートを選ぶと、名簿の{studentCount}人それぞれの名前で絵本を一括生成します（管理者のみ）。
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-violet-500">テンプレート</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-purple-900"
          >
            <option value="">選択してください</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-violet-500">みんなへのメッセージ（任意・最終ページに入ります）</label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ご卒園おめでとう！"
            maxLength={200}
          />
        </div>
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
        {result ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{result}</p>
        ) : null}
        <Button className="w-full" onClick={handleGenerate} disabled={!templateId || busy}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
          {studentCount}人分を一括生成する
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ClassRosterPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-violet-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <ClassRosterContent />
    </Suspense>
  );
}
