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
import { GraduationCap, Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import type { OrgClass, OrgStudent } from "@/lib/types";

function ClassRosterContent() {
  const params = useSearchParams();
  const orgId = params.get("orgId") ?? "";
  const classId = params.get("classId") ?? "";
  const { user } = useAuth();

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

      <p className="mt-6 text-center text-xs text-violet-400">
        次のアップデートで、このクラス全員分の絵本を一括生成できるようになります。
      </p>
    </PageTransition>
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
